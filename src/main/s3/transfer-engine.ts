import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { EventEmitter } from 'events'
import type { S3Client } from '@aws-sdk/client-s3'
import { listAllObjectsUnderPrefix } from './browser'
import { AppError } from '../../shared/app-error'
import type { BatchProgress, TransferItem, TransferJobProgress } from '../../shared/types'

const MULTIPART_THRESHOLD = 100 * 1024 * 1024
const MAX_RETRIES = 3
const CONCURRENCY = 4

function joinPrefix(base: string, relative: string): string {
  const cleanBase = base.replace(/^\//, '').replace(/\/$/, '')
  const cleanRelative = relative.replace(/^\//, '')
  if (!cleanBase) return cleanRelative
  if (!cleanRelative) return cleanBase
  return `${cleanBase}/${cleanRelative}`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
  if (status && [408, 429, 500, 502, 503, 504].includes(status)) return true
  const code = (error as { code?: string }).code
  return code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'NetworkingError'
}

export class TransferEngine extends EventEmitter {
  private activeBatchId: string | null = null
  private abortControllers = new Map<string, AbortController>()
  private cancelled = false

  async enqueueBatch(
    batchId: string,
    sourceClient: S3Client,
    sourceBucket: string,
    destClient: S3Client,
    destBucket: string,
    destPrefix: string,
    items: TransferItem[]
  ): Promise<void> {
    if (this.activeBatchId) {
      throw new AppError('errors.transfer.inProgress')
    }

    this.activeBatchId = batchId
    this.cancelled = false

    const jobs: TransferJobProgress[] = []

    for (const item of items) {
      if (item.isFolder) {
        const objects = await listAllObjectsUnderPrefix(sourceClient, sourceBucket, item.sourceKey)
        const folderName = item.sourceKey.replace(/\/$/, '').split('/').pop() ?? ''
        const targetBase = joinPrefix(destPrefix, folderName)

        for (const object of objects) {
          const relativeKey = object.key.slice(item.sourceKey.length)
          jobs.push({
            id: `${batchId}-${jobs.length}`,
            sourceKey: object.key,
            destKey: joinPrefix(targetBase, relativeKey),
            status: 'pending',
            bytesTransferred: 0,
            totalBytes: object.size
          })
        }
      } else {
        const fileName = item.sourceKey.split('/').pop() ?? item.sourceKey
        jobs.push({
          id: `${batchId}-${jobs.length}`,
          sourceKey: item.sourceKey,
          destKey: joinPrefix(destPrefix, fileName),
          status: 'pending',
          bytesTransferred: 0,
          totalBytes: 0
        })
      }
    }

    const batch: BatchProgress = {
      batchId,
      totalJobs: jobs.length,
      completedJobs: 0,
      failedJobs: 0,
      bytesTransferred: 0,
      totalBytes: jobs.reduce((sum, job) => sum + job.totalBytes, 0),
      jobs,
      status: 'running'
    }

    this.emit('batch-progress', batch)

    if (jobs.length === 0) {
      batch.status = 'completed'
      this.emit('batch-progress', batch)
      this.activeBatchId = null
      return
    }

    let index = 0
    const workers = Array.from({ length: CONCURRENCY }, async () => {
      while (index < jobs.length && !this.cancelled) {
        const jobIndex = index++
        const job = jobs[jobIndex]
        await this.runJob(job, sourceClient, sourceBucket, destClient, destBucket, batch)
      }
    })

    await Promise.all(workers)

    if (this.cancelled) {
      batch.status = 'cancelled'
      for (const job of jobs) {
        if (job.status === 'pending' || job.status === 'running') {
          job.status = 'cancelled'
        }
      }
    } else if (batch.failedJobs > 0) {
      batch.status = 'failed'
    } else {
      batch.status = 'completed'
    }

    this.emit('batch-progress', { ...batch })
    this.activeBatchId = null
    this.abortControllers.clear()
  }

  cancelBatch(): void {
    this.cancelled = true
    for (const controller of this.abortControllers.values()) {
      controller.abort()
    }
  }

  private async runJob(
    job: TransferJobProgress,
    sourceClient: S3Client,
    sourceBucket: string,
    destClient: S3Client,
    destBucket: string,
    batch: BatchProgress
  ): Promise<void> {
    if (this.cancelled) {
      job.status = 'cancelled'
      return
    }

    job.status = 'running'
    this.emit('batch-progress', { ...batch, jobs: [...batch.jobs] })

    const controller = new AbortController()
    this.abortControllers.set(job.id, controller)

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      if (this.cancelled) {
        job.status = 'cancelled'
        return
      }

      try {
        const head = await sourceClient.send(
          new HeadObjectCommand({ Bucket: sourceBucket, Key: job.sourceKey })
        )

        job.totalBytes = head.ContentLength ?? job.totalBytes
        batch.totalBytes = batch.jobs.reduce((sum, j) => sum + j.totalBytes, 0)

        const getResponse = await sourceClient.send(
          new GetObjectCommand({ Bucket: sourceBucket, Key: job.sourceKey })
        )

        if (!getResponse.Body) {
          throw new Error('Corpo do objeto vazio')
        }

        const body = getResponse.Body
        const contentType = head.ContentType

        if (job.totalBytes >= MULTIPART_THRESHOLD) {
          const upload = new Upload({
            client: destClient,
            params: {
              Bucket: destBucket,
              Key: job.destKey,
              Body: body,
              ContentType: contentType
            },
            queueSize: 4,
            partSize: 10 * 1024 * 1024,
            leavePartsOnError: false
          })

          upload.on('httpUploadProgress', (progress) => {
            job.bytesTransferred = progress.loaded ?? 0
            batch.bytesTransferred = batch.jobs.reduce((sum, j) => sum + j.bytesTransferred, 0)
            this.emit('batch-progress', { ...batch, jobs: [...batch.jobs] })
          })

          await upload.done()
        } else {
          const upload = new Upload({
            client: destClient,
            params: {
              Bucket: destBucket,
              Key: job.destKey,
              Body: body,
              ContentType: contentType
            }
          })

          upload.on('httpUploadProgress', (progress) => {
            job.bytesTransferred = progress.loaded ?? 0
            batch.bytesTransferred = batch.jobs.reduce((sum, j) => sum + j.bytesTransferred, 0)
            this.emit('batch-progress', { ...batch, jobs: [...batch.jobs] })
          })

          await upload.done()
        }

        job.bytesTransferred = job.totalBytes
        job.status = 'completed'
        batch.completedJobs += 1
        batch.bytesTransferred = batch.jobs.reduce((sum, j) => sum + j.bytesTransferred, 0)
        this.emit('batch-progress', { ...batch, jobs: [...batch.jobs] })
        return
      } catch (error) {
        if (this.cancelled || controller.signal.aborted) {
          job.status = 'cancelled'
          return
        }

        if (attempt < MAX_RETRIES && isRetryable(error)) {
          await sleep(500 * 2 ** (attempt - 1))
          continue
        }

        job.status = 'failed'
        job.error = error instanceof Error ? error.message : 'Erro desconhecido'
        batch.failedJobs += 1
        this.emit('batch-progress', { ...batch, jobs: [...batch.jobs] })
        return
      } finally {
        this.abortControllers.delete(job.id)
      }
    }
  }
}

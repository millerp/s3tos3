import {
  HeadBucketCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type S3Client
} from '@aws-sdk/client-s3'
import { AppError } from '../../shared/app-error'
import type { ListBucketsResult, S3ObjectItem, StorageProfile } from '../../shared/types'

export function normalizeBucketName(bucket: string): string {
  return bucket.trim()
}

export async function testConnection(client: S3Client, profile: StorageProfile): Promise<void> {
  await client.send(new ListBucketsCommand({}))

  if (profile.provider === 'oracle' && profile.manualBuckets?.length) {
    await client.send(
      new ListObjectsV2Command({
        Bucket: profile.manualBuckets[0],
        MaxKeys: 1
      })
    )
  }
}

export async function listBuckets(client: S3Client, profile: StorageProfile): Promise<ListBucketsResult> {
  const response = await client.send(new ListBucketsCommand({}))

  const apiBuckets = (response.Buckets ?? [])
    .map((bucket) => bucket.Name)
    .filter((name): name is string => Boolean(name))

  const manualBuckets = profile.manualBuckets ?? []
  const buckets = [...new Set([...apiBuckets, ...manualBuckets])].sort((a, b) => a.localeCompare(b))

  if (profile.provider === 'oracle' && buckets.length === 0) {
    return {
      buckets,
      hintKey: 'hints.oracleEmptyBuckets'
    }
  }

  if (profile.provider === 'oracle' && apiBuckets.length === 0 && manualBuckets.length > 0) {
    return {
      buckets,
      hintKey: 'hints.oracleManualBuckets'
    }
  }

  return { buckets }
}

export async function validateBucket(client: S3Client, bucket: string): Promise<void> {
  await client.send(new HeadBucketCommand({ Bucket: normalizeBucketName(bucket) }))
}

export async function listObjects(
  client: S3Client,
  bucket: string,
  prefix = ''
): Promise<S3ObjectItem[]> {
  const normalizedBucket = normalizeBucketName(bucket)
  const normalizedPrefix = prefix.replace(/^\//, '')
  const delimiter = '/'

  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: normalizedBucket,
      Prefix: normalizedPrefix || undefined,
      Delimiter: delimiter
    })
  )

  const folders: S3ObjectItem[] = (response.CommonPrefixes ?? [])
    .map((entry) => entry.Prefix)
    .filter((folderPrefix): folderPrefix is string => Boolean(folderPrefix))
    .map((folderPrefix) => {
      const trimmed = folderPrefix.slice(normalizedPrefix.length)
      const name = trimmed.replace(/\/$/, '')
      return {
        key: folderPrefix,
        name,
        isFolder: true
      }
    })

  const files: S3ObjectItem[] = (response.Contents ?? [])
    .filter((object) => object.Key && object.Key !== normalizedPrefix)
    .map((object) => {
      const key = object.Key!
      const name = key.slice(normalizedPrefix.length)
      return {
        key,
        name,
        isFolder: false,
        size: object.Size,
        lastModified: object.LastModified?.toISOString()
      }
    })
    .filter((item) => item.name.length > 0)

  return [...folders, ...files].sort((a, b) => {
    if (a.isFolder !== b.isFolder) {
      return a.isFolder ? -1 : 1
    }
    return a.name.localeCompare(b.name)
  })
}

export async function listAllObjectsUnderPrefix(
  client: S3Client,
  bucket: string,
  prefix: string
): Promise<Array<{ key: string; size: number }>> {
  const normalizedPrefix = prefix.replace(/^\//, '')
  const objects: Array<{ key: string; size: number }> = []
  let continuationToken: string | undefined

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: normalizedPrefix,
        ContinuationToken: continuationToken
      })
    )

    for (const object of response.Contents ?? []) {
      if (!object.Key || object.Key === normalizedPrefix) continue
      if (object.Key.endsWith('/') && (object.Size ?? 0) === 0) continue
      objects.push({ key: object.Key, size: object.Size ?? 0 })
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
  } while (continuationToken)

  return objects
}

export async function bucketExists(client: S3Client, bucket: string): Promise<boolean> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }))
    return true
  } catch {
    return false
  }
}

export function buildFolderKey(parentPrefix: string, folderName: string): string {
  const cleanName = folderName.trim().replace(/\/+$/, '')
  if (!cleanName) {
    throw new AppError('errors.folder.nameRequired')
  }
  if (cleanName.includes('/')) {
    throw new AppError('errors.folder.invalidChars')
  }

  const cleanParent = parentPrefix.replace(/^\//, '').replace(/\/+$/, '')
  return cleanParent ? `${cleanParent}/${cleanName}/` : `${cleanName}/`
}

export async function createFolder(
  client: S3Client,
  bucket: string,
  parentPrefix: string,
  folderName: string
): Promise<string> {
  const normalizedBucket = normalizeBucketName(bucket)
  const folderKey = buildFolderKey(parentPrefix, folderName)

  await client.send(
    new PutObjectCommand({
      Bucket: normalizedBucket,
      Key: folderKey,
      Body: '',
      ContentLength: 0
    })
  )

  return folderKey
}

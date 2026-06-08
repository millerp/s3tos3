import { ipcMain, BrowserWindow } from 'electron'

import { randomUUID } from 'crypto'

import { createS3Client } from '../s3/client-factory'

import {
  createFolder,
  listBuckets,
  listObjects,
  normalizeBucketName,
  testConnection,
  validateBucket
} from '../s3/browser'

import { formatS3Error } from '../s3/errors'

import { TransferEngine } from '../s3/transfer-engine'

import { deleteProfile, getProfile, listProfiles, saveProfile } from '../store/profiles'

import { AppError } from '../../shared/app-error'
import type { StorageProfile, TransferRequest } from '../../shared/types'



const transferEngine = new TransferEngine()



function getWindow(): BrowserWindow | null {

  return BrowserWindow.getAllWindows()[0] ?? null

}



function requireProfile(profileId: string): StorageProfile {

  const profile = getProfile(profileId)

  if (!profile) {

    throw new AppError('errors.profileNotFound')

  }

  return profile

}



async function withS3Error<T>(

  profile: StorageProfile,

  bucket: string | undefined,

  action: () => Promise<T>

): Promise<T> {

  try {

    return await action()

  } catch (error) {

    throw formatS3Error(error, profile, bucket)

  }

}



export function registerIpcHandlers(): void {

  transferEngine.on('batch-progress', (progress) => {

    const window = getWindow()

    window?.webContents.send('transfer:progress', progress)

  })



  ipcMain.handle('profiles:list', () => listProfiles())



  ipcMain.handle('profiles:save', (_event, profile) => saveProfile(profile))



  ipcMain.handle('profiles:delete', (_event, id: string) => {

    deleteProfile(id)

    return true

  })



  ipcMain.handle('s3:testConnection', async (_event, profileId: string) => {

    const profile = requireProfile(profileId)

    const client = createS3Client(profile)

    return withS3Error(profile, undefined, async () => {

      await testConnection(client, profile)

      return true

    })

  })



  ipcMain.handle('s3:listBuckets', async (_event, profileId: string) => {

    const profile = requireProfile(profileId)

    const client = createS3Client(profile)

    return withS3Error(profile, undefined, () => listBuckets(client, profile))

  })



  ipcMain.handle('s3:validateBucket', async (_event, profileId: string, bucket: string) => {

    const profile = requireProfile(profileId)

    const client = createS3Client(profile)

    const normalizedBucket = normalizeBucketName(bucket)

    return withS3Error(profile, normalizedBucket, async () => {

      await validateBucket(client, normalizedBucket)

      return true

    })

  })



  ipcMain.handle(

    's3:listObjects',

    async (_event, profileId: string, bucket: string, prefix?: string) => {

      const profile = requireProfile(profileId)

      const client = createS3Client(profile)

      const normalizedBucket = normalizeBucketName(bucket)

      return withS3Error(profile, normalizedBucket, () =>

        listObjects(client, normalizedBucket, prefix ?? '')

      )

    }

  )



  ipcMain.handle(
    's3:createFolder',
    async (_event, profileId: string, bucket: string, parentPrefix: string, folderName: string) => {
      const profile = requireProfile(profileId)
      const client = createS3Client(profile)
      const normalizedBucket = normalizeBucketName(bucket)

      return withS3Error(profile, normalizedBucket, () =>
        createFolder(client, normalizedBucket, parentPrefix, folderName)
      )
    }
  )

  ipcMain.handle('transfer:start', async (_event, request: TransferRequest) => {

    const sourceProfile = requireProfile(request.sourceProfileId)

    const destProfile = requireProfile(request.destProfileId)

    const sourceClient = createS3Client(sourceProfile)

    const destClient = createS3Client(destProfile)

    const batchId = randomUUID()



    void transferEngine.enqueueBatch(

      batchId,

      sourceClient,

      request.sourceBucket,

      destClient,

      request.destBucket,

      request.destPrefix,

      request.items

    )



    return batchId

  })



  ipcMain.handle('transfer:cancel', () => {

    transferEngine.cancelBatch()

    return true

  })

}



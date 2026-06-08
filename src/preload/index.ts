import { contextBridge, ipcRenderer } from 'electron'
import type {
  BatchProgress,
  ListBucketsResult,
  S3ObjectItem,
  StorageProfileInput,
  StorageProfilePublic,
  TransferRequest
} from '../shared/types'

const api = {
  profiles: {
    list: (): Promise<StorageProfilePublic[]> => ipcRenderer.invoke('profiles:list'),
    save: (profile: StorageProfileInput): Promise<StorageProfilePublic> =>
      ipcRenderer.invoke('profiles:save', profile),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('profiles:delete', id)
  },
  s3: {
    testConnection: (profileId: string): Promise<boolean> =>
      ipcRenderer.invoke('s3:testConnection', profileId),
    listBuckets: (profileId: string): Promise<ListBucketsResult> =>
      ipcRenderer.invoke('s3:listBuckets', profileId),
    validateBucket: (profileId: string, bucket: string): Promise<boolean> =>
      ipcRenderer.invoke('s3:validateBucket', profileId, bucket),
    listObjects: (
      profileId: string,
      bucket: string,
      prefix?: string
    ): Promise<S3ObjectItem[]> => ipcRenderer.invoke('s3:listObjects', profileId, bucket, prefix),
    createFolder: (
      profileId: string,
      bucket: string,
      parentPrefix: string,
      folderName: string
    ): Promise<string> =>
      ipcRenderer.invoke('s3:createFolder', profileId, bucket, parentPrefix, folderName)
  },
  transfer: {
    start: (request: TransferRequest): Promise<string> =>
      ipcRenderer.invoke('transfer:start', request),
    cancel: (): Promise<boolean> => ipcRenderer.invoke('transfer:cancel'),
    onProgress: (callback: (progress: BatchProgress) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, progress: BatchProgress): void => {
        callback(progress)
      }
      ipcRenderer.on('transfer:progress', listener)
      return () => ipcRenderer.removeListener('transfer:progress', listener)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)

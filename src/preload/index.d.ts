import type {
  BatchProgress,
  ListBucketsResult,
  S3ObjectItem,
  StorageProfileInput,
  StorageProfilePublic,
  TransferRequest
} from '../shared/types'

export interface S3Api {
  profiles: {
    list: () => Promise<StorageProfilePublic[]>
    save: (profile: StorageProfileInput) => Promise<StorageProfilePublic>
    delete: (id: string) => Promise<boolean>
  }
  s3: {
    testConnection: (profileId: string) => Promise<boolean>
    listBuckets: (profileId: string) => Promise<ListBucketsResult>
    validateBucket: (profileId: string, bucket: string) => Promise<boolean>
    listObjects: (profileId: string, bucket: string, prefix?: string) => Promise<S3ObjectItem[]>
    createFolder: (
      profileId: string,
      bucket: string,
      parentPrefix: string,
      folderName: string
    ) => Promise<string>
  }
  transfer: {
    start: (request: TransferRequest) => Promise<string>
    cancel: () => Promise<boolean>
    onProgress: (callback: (progress: BatchProgress) => void) => () => void
  }
}

declare global {
  interface Window {
    api: S3Api
  }
}

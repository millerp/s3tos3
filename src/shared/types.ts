export type Provider = 'aws' | 'oracle'

export interface StorageProfile {
  id: string
  name: string
  provider: Provider
  accessKeyId: string
  secretAccessKey: string
  region: string
  namespace?: string
  manualBuckets?: string[]
}

export type StorageProfileInput = Omit<StorageProfile, 'id' | 'secretAccessKey'> & {
  id?: string
  secretAccessKey?: string
}

export interface StorageProfilePublic {
  id: string
  name: string
  provider: Provider
  region: string
  namespace?: string
  accessKeyId: string
  manualBuckets?: string[]
}

export interface ListBucketsResult {
  buckets: string[]
  hint?: string
  hintKey?: string
}

export interface S3ObjectItem {
  key: string
  name: string
  isFolder: boolean
  size?: number
  lastModified?: string
}

export interface TransferItem {
  sourceKey: string
  destKey: string
  isFolder: boolean
}

export interface TransferRequest {
  sourceProfileId: string
  sourceBucket: string
  destProfileId: string
  destBucket: string
  destPrefix: string
  items: TransferItem[]
}

export type TransferJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface TransferJobProgress {
  id: string
  sourceKey: string
  destKey: string
  status: TransferJobStatus
  bytesTransferred: number
  totalBytes: number
  error?: string
}

export interface BatchProgress {
  batchId: string
  totalJobs: number
  completedJobs: number
  failedJobs: number
  bytesTransferred: number
  totalBytes: number
  jobs: TransferJobProgress[]
  status: 'running' | 'completed' | 'failed' | 'cancelled'
}

export interface DragPayload {
  sourceProfileId: string
  sourceBucket: string
  items: TransferItem[]
}

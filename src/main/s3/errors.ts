import { AppError } from '../../shared/app-error'
import type { StorageProfile } from '../../shared/types'
import { buildOracleEndpoint } from './client-factory'

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const record = error as { Code?: string; name?: string }
  return record.Code ?? record.name
}

export function formatS3Error(
  error: unknown,
  profile: StorageProfile,
  bucket?: string
): AppError {
  const code = getErrorCode(error)
  const bucketName = bucket ?? ''

  if (code === 'NoSuchBucket' && profile.provider === 'oracle') {
    const endpoint = profile.namespace
      ? buildOracleEndpoint(profile.namespace, profile.region)
      : ''

    return new AppError('errors.s3.noSuchBucketOracle', {
      bucket: bucketName,
      namespace: profile.namespace ?? '',
      region: profile.region,
      endpoint
    })
  }

  if (code === 'NoSuchBucket') {
    return new AppError('errors.s3.noSuchBucket', {
      bucket: bucketName,
      region: profile.region
    })
  }

  if (code === 'AccessDenied' || code === 'Forbidden' || code === '403') {
    return new AppError('errors.s3.accessDenied', { bucket: bucketName })
  }

  if (code === 'InvalidAccessKeyId' || code === 'SignatureDoesNotMatch') {
    return new AppError('errors.s3.invalidCredentials')
  }

  if (error instanceof AppError) {
    return error
  }

  const message =
    error instanceof Error
      ? error.message
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : ''

  return new AppError('errors.s3.unknown', { detail: message })
}

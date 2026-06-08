import { S3Client, type S3ClientConfig } from '@aws-sdk/client-s3'
import { AppError } from '../../shared/app-error'
import type { StorageProfile } from '../../shared/types'

export function buildOracleEndpoint(namespace: string, region: string): string {
  return `https://${namespace}.compat.objectstorage.${region}.oraclecloud.com`
}

function baseClientConfig(profile: StorageProfile): S3ClientConfig {
  return {
    region: profile.region,
    credentials: {
      accessKeyId: profile.accessKeyId,
      secretAccessKey: profile.secretAccessKey
    },
    // Necessário para APIs S3 de terceiros (Oracle) com AWS SDK v3.729+
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED'
  }
}

export function createS3Client(profile: StorageProfile): S3Client {
  if (profile.provider === 'oracle') {
    if (!profile.namespace) {
      throw new AppError('errors.oracleNamespace')
    }

    return new S3Client({
      ...baseClientConfig(profile),
      endpoint: buildOracleEndpoint(profile.namespace, profile.region),
      forcePathStyle: true
    })
  }

  return new S3Client(baseClientConfig(profile))
}

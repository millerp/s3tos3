import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import { app, safeStorage } from 'electron'
import { AppError } from '../../shared/app-error'

const ENCRYPTION_PREFIX = 's3tos3:v1:'
const AES_SALT = 's3tos3-credential-store'

export function isEncryptedCredential(value: string): boolean {
  return value.startsWith(ENCRYPTION_PREFIX)
}

export function encryptCredential(plain: string): string {
  if (!plain) return plain

  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(plain)
    return `${ENCRYPTION_PREFIX}os:${encrypted.toString('base64')}`
  }

  const key = getFallbackKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  const payload = Buffer.concat([iv, tag, ciphertext])
  return `${ENCRYPTION_PREFIX}aes:${payload.toString('base64')}`
}

export function decryptCredential(stored: string): string {
  if (!stored) return stored

  if (!isEncryptedCredential(stored)) {
    return stored
  }

  const body = stored.slice(ENCRYPTION_PREFIX.length)

  try {
    if (body.startsWith('os:')) {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new AppError('errors.profile.decryptUnavailable')
      }
      const buffer = Buffer.from(body.slice(3), 'base64')
      return safeStorage.decryptString(buffer)
    }

    if (body.startsWith('aes:')) {
      const payload = Buffer.from(body.slice(4), 'base64')
      const iv = payload.subarray(0, 12)
      const tag = payload.subarray(12, 28)
      const ciphertext = payload.subarray(28)
      const decipher = createDecipheriv('aes-256-gcm', getFallbackKey(), iv)
      decipher.setAuthTag(tag)
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
    }
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('errors.profile.decryptFailed')
  }

  throw new AppError('errors.profile.decryptFailed')
}

function getFallbackKey(): Buffer {
  const secret = `${app.getPath('userData')}:${app.getName()}`
  return scryptSync(secret, AES_SALT, 32)
}

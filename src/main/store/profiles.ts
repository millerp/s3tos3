import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { AppError } from '../../shared/app-error'
import type { StorageProfile, StorageProfileInput, StorageProfilePublic } from '../../shared/types'
import {
  decryptCredential,
  encryptCredential,
  isEncryptedCredential
} from './credential-crypto'

const STORE_VERSION = 2

interface StoredStorageProfile {
  id: string
  name: string
  provider: StorageProfile['provider']
  accessKeyId: string
  secretAccessKey: string
  region: string
  namespace?: string
  manualBuckets?: string[]
}

interface StoreSchema {
  version?: number
  profiles: StoredStorageProfile[]
}

function getStoreFile(): string {
  const dir = join(app.getPath('userData'), 'data')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return join(dir, 'profiles.json')
}

function fromStored(stored: StoredStorageProfile): StorageProfile {
  return {
    id: stored.id,
    name: stored.name,
    provider: stored.provider,
    accessKeyId: decryptCredential(stored.accessKeyId),
    secretAccessKey: decryptCredential(stored.secretAccessKey),
    region: stored.region,
    namespace: stored.namespace,
    manualBuckets: stored.manualBuckets
  }
}

function toStored(profile: StorageProfile): StoredStorageProfile {
  return {
    id: profile.id,
    name: profile.name,
    provider: profile.provider,
    accessKeyId: encryptCredential(profile.accessKeyId),
    secretAccessKey: encryptCredential(profile.secretAccessKey),
    region: profile.region,
    namespace: profile.namespace,
    manualBuckets: profile.manualBuckets
  }
}

function needsEncryptionMigration(stored: StoredStorageProfile): boolean {
  return (
    !isEncryptedCredential(stored.accessKeyId) ||
    !isEncryptedCredential(stored.secretAccessKey)
  )
}

function readStore(): { profiles: StorageProfile[] } {
  const file = getStoreFile()
  if (!existsSync(file)) {
    return { profiles: [] }
  }

  const data = JSON.parse(readFileSync(file, 'utf-8')) as StoreSchema
  const storedProfiles = data.profiles ?? []
  const profiles = storedProfiles.map(fromStored)

  const shouldMigrate =
    data.version !== STORE_VERSION ||
    storedProfiles.some(needsEncryptionMigration)

  if (shouldMigrate) {
    writeStore({ profiles })
  }

  return { profiles }
}

function writeStore(data: { profiles: StorageProfile[] }): void {
  const payload: StoreSchema = {
    version: STORE_VERSION,
    profiles: data.profiles.map(toStored)
  }
  writeFileSync(getStoreFile(), JSON.stringify(payload, null, 2), 'utf-8')
}

function toPublic(profile: StorageProfile): StorageProfilePublic {
  return {
    id: profile.id,
    name: profile.name,
    provider: profile.provider,
    region: profile.region,
    namespace: profile.namespace,
    accessKeyId: profile.accessKeyId,
    manualBuckets: profile.manualBuckets
  }
}

export function listProfiles(): StorageProfilePublic[] {
  return readStore().profiles.map(toPublic)
}

export function getProfile(id: string): StorageProfile | undefined {
  return readStore().profiles.find((profile) => profile.id === id)
}

export function saveProfile(profile: StorageProfileInput): StorageProfilePublic {
  const store = readStore()
  const profiles = store.profiles
  const existingIndex = profile.id ? profiles.findIndex((p) => p.id === profile.id) : -1
  const existing = existingIndex >= 0 ? profiles[existingIndex] : undefined

  const secret = profile.secretAccessKey?.trim()
  if (!secret && !existing) {
    throw new AppError('errors.profile.secretRequiredSave')
  }

  const saved: StorageProfile = {
    id: profile.id ?? randomUUID(),
    name: profile.name,
    provider: profile.provider,
    accessKeyId: profile.accessKeyId,
    secretAccessKey: secret || existing!.secretAccessKey,
    region: profile.region,
    namespace: profile.namespace,
    manualBuckets: profile.manualBuckets?.map((b) => b.trim()).filter(Boolean)
  }

  if (existingIndex >= 0) {
    profiles[existingIndex] = saved
  } else {
    profiles.push(saved)
  }

  writeStore({ profiles })
  return toPublic(saved)
}

export function deleteProfile(id: string): void {
  const store = readStore()
  store.profiles = store.profiles.filter((profile) => profile.id !== id)
  writeStore(store)
}

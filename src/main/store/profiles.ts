import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { AppError } from '../../shared/app-error'
import type { StorageProfile, StorageProfileInput, StorageProfilePublic } from '../../shared/types'

interface StoreSchema {
  profiles: StorageProfile[]
}

function getStoreFile(): string {
  const dir = join(app.getPath('userData'), 'data')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return join(dir, 'profiles.json')
}

function readStore(): StoreSchema {
  const file = getStoreFile()
  if (!existsSync(file)) {
    return { profiles: [] }
  }
  return JSON.parse(readFileSync(file, 'utf-8')) as StoreSchema
}

function writeStore(data: StoreSchema): void {
  writeFileSync(getStoreFile(), JSON.stringify(data, null, 2), 'utf-8')
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

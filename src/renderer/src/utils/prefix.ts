export function parentPrefix(prefix: string): string {
  if (!prefix) return ''
  const parts = prefix.replace(/\/$/, '').split('/').filter(Boolean)
  parts.pop()
  return parts.length ? `${parts.join('/')}/` : ''
}

import { AppError } from '../../../shared/app-error'

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

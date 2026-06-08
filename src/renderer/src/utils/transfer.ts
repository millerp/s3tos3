import type { S3ObjectItem } from '../../../shared/types'

export function buildTransferItems(item: S3ObjectItem): Array<{
  sourceKey: string
  destKey: string
  isFolder: boolean
  label: string
}> {
  return [
    {
      sourceKey: item.key,
      destKey: '',
      isFolder: item.isFolder,
      label: item.isFolder ? `${item.name}/` : item.name
    }
  ]
}

export function resolveDestKey(destPrefix: string, sourceKey: string, isFolder: boolean): string {
  const cleanPrefix = destPrefix.replace(/^\//, '').replace(/\/$/, '')

  if (isFolder) {
    const folderName = sourceKey.replace(/\/$/, '').split('/').pop() ?? sourceKey
    return cleanPrefix ? `${cleanPrefix}/${folderName}/` : `${folderName}/`
  }

  const fileName = sourceKey.split('/').pop() ?? sourceKey
  return cleanPrefix ? `${cleanPrefix}/${fileName}` : fileName
}

import { useCallback, useEffect } from 'react'
import { useAppStore } from '../stores/appStore'
import type { TransferItem } from '../../../shared/types'

export function useTransfer() {
  const batch = useAppStore((state) => state.batch)
  const setBatch = useAppStore((state) => state.setBatch)
  const source = useAppStore((state) => state.source)
  const dest = useAppStore((state) => state.dest)

  useEffect(() => {
    const unsubscribe = window.api.transfer.onProgress((progress) => {
      setBatch(progress)
    })
    return unsubscribe
  }, [setBatch])

  const startTransfer = useCallback(
    async (items: TransferItem[]) => {
      if (!source.profileId || !source.bucket || !dest.profileId || !dest.bucket) {
        throw new Error('Configure origem e destino antes de transferir')
      }

      await window.api.transfer.start({
        sourceProfileId: source.profileId,
        sourceBucket: source.bucket,
        destProfileId: dest.profileId,
        destBucket: dest.bucket,
        destPrefix: dest.prefix,
        items
      })
    },
    [dest.bucket, dest.prefix, dest.profileId, source.bucket, source.profileId]
  )

  const cancelTransfer = useCallback(async () => {
    await window.api.transfer.cancel()
  }, [])

  return { batch, startTransfer, cancelTransfer }
}

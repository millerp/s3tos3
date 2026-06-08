import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/appStore'
import { translateError } from '../utils/translateError'

export function useS3Browser(side: 'source' | 'dest') {
  const { t } = useTranslation()
  const pane = useAppStore((state) => state[side])
  const setPane = useAppStore((state) => state.setPane)

  const loadBuckets = useCallback(async () => {
    if (!pane.profileId) return []
    const result = await window.api.s3.listBuckets(pane.profileId)
    return result.buckets
  }, [pane.profileId])

  const loadObjects = useCallback(
    async (bucket: string, prefix = '') => {
      if (!pane.profileId || !bucket) return

      setPane(side, { loading: true, error: null })
      try {
        const items = await window.api.s3.listObjects(pane.profileId, bucket, prefix)
        setPane(side, { items, prefix, loading: false })
      } catch (error) {
        setPane(side, {
          loading: false,
          error: translateError(error, t) || t('errors.listObjects')
        })
      }
    },
    [pane.profileId, setPane, side, t]
  )

  const selectProfile = useCallback(
    async (profileId: string) => {
      setPane(side, {
        profileId,
        bucket: '',
        prefix: '',
        items: [],
        error: null
      })
    },
    [setPane, side]
  )

  const selectBucket = useCallback(
    async (bucket: string) => {
      const normalizedBucket = bucket.trim()
      if (!normalizedBucket) return
      setPane(side, { bucket: normalizedBucket, prefix: '' })
      await loadObjects(normalizedBucket, '')
    },
    [loadObjects, setPane, side]
  )

  const navigateTo = useCallback(
    async (prefix: string) => {
      if (!pane.bucket) return
      await loadObjects(pane.bucket, prefix)
    },
    [loadObjects, pane.bucket]
  )

  const refresh = useCallback(async () => {
    if (!pane.bucket) return
    await loadObjects(pane.bucket, pane.prefix)
  }, [loadObjects, pane.bucket, pane.prefix])

  return {
    pane,
    loadBuckets,
    loadObjects,
    selectProfile,
    selectBucket,
    navigateTo,
    refresh
  }
}

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { StorageProfilePublic } from '../../../shared/types'
import { translateError } from '../utils/translateError'

interface ConnectionBarProps {
  title: string
  profiles: StorageProfilePublic[]
  profileId: string
  bucket: string
  onProfileChange: (profileId: string) => void
  onBucketChange: (bucket: string) => void
  accentClass: string
}

export function ConnectionBar({
  title,
  profiles,
  profileId,
  bucket,
  onProfileChange,
  onBucketChange,
  accentClass
}: ConnectionBarProps): React.JSX.Element {
  const { t } = useTranslation()
  const [buckets, setBuckets] = useState<string[]>([])
  const [loadingBuckets, setLoadingBuckets] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [manualBucket, setManualBucket] = useState('')

  const selectedProfile = profiles.find((profile) => profile.id === profileId)
  const isOracle = selectedProfile?.provider === 'oracle'

  useEffect(() => {
    if (!profileId) {
      setBuckets([])
      setHint(null)
      return
    }

    setLoadingBuckets(true)
    setError(null)
    setHint(null)
    window.api.s3
      .listBuckets(profileId)
      .then((result) => {
        setBuckets(result.buckets)
        setHint(result.hintKey ? t(result.hintKey) : (result.hint ?? null))
      })
      .catch((err: unknown) => {
        setBuckets([])
        setHint(null)
        setError(translateError(err, t) || t('errors.listBuckets'))
      })
      .finally(() => setLoadingBuckets(false))
  }, [profileId, t])

  const applyManualBucket = (): void => {
    const value = manualBucket.trim()
    if (value) onBucketChange(value)
  }

  return (
    <div className={`border-b border-slate-700/80 bg-slate-800/50 px-4 py-3 ${accentClass}`}>
      <div className="mb-2.5 flex items-center gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-slate-100">{title}</h2>
        {bucket && (
          <span className="truncate rounded-full bg-slate-900/80 px-2 py-0.5 text-xs text-slate-400">
            {bucket}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <select
          value={profileId}
          onChange={(event) => onProfileChange(event.target.value)}
          className="rounded-lg border border-slate-600/80 bg-slate-900 px-2.5 py-2 text-sm text-slate-100 outline-none focus:border-sky-500/60"
        >
          <option value="">{t('pane.selectProfile')}</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name} ({profile.provider.toUpperCase()})
            </option>
          ))}
        </select>
        <select
          value={bucket}
          disabled={!profileId || loadingBuckets}
          onChange={(event) => onBucketChange(event.target.value)}
          className="rounded-lg border border-slate-600/80 bg-slate-900 px-2.5 py-2 text-sm text-slate-100 outline-none focus:border-sky-500/60 disabled:opacity-50"
        >
          <option value="">
            {loadingBuckets ? t('common.loadingBuckets') : t('pane.selectBucket')}
          </option>
          {bucket && !buckets.includes(bucket) && (
            <option value={bucket}>
              {bucket} ({t('common.manual')})
            </option>
          )}
          {buckets.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {(isOracle || buckets.length === 0) && profileId && (
        <div className="mt-2 flex gap-2">
          <input
            value={manualBucket}
            onChange={(event) => setManualBucket(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && applyManualBucket()}
            placeholder={t('pane.manualBucketPlaceholder')}
            className="min-w-0 flex-1 rounded-lg border border-slate-600/80 bg-slate-900 px-2.5 py-2 text-sm text-slate-100 outline-none focus:border-sky-500/60"
          />
          <button
            type="button"
            onClick={applyManualBucket}
            disabled={!manualBucket.trim()}
            className="rounded-lg bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600 disabled:opacity-50"
          >
            {t('common.use')}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="mt-2 text-xs leading-relaxed text-amber-400/90">{hint}</p>}
    </div>
  )
}

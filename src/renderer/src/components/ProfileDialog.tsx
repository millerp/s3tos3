import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppError } from '../../../shared/app-error'
import type { Provider, StorageProfilePublic } from '../../../shared/types'
import { translateError } from '../utils/translateError'

interface ProfileForm {
  id?: string
  name: string
  provider: Provider
  accessKeyId: string
  secretAccessKey: string
  region: string
  namespace: string
  manualBucketsText: string
}

interface ProfileDialogProps {
  open: boolean
  profiles: StorageProfilePublic[]
  editingId: string | null
  onClose: () => void
  onSaved: () => void
}

const emptyForm = (): ProfileForm => ({
  name: '',
  provider: 'aws',
  accessKeyId: '',
  secretAccessKey: '',
  region: 'us-east-1',
  namespace: '',
  manualBucketsText: ''
})

export function ProfileDialog({
  open,
  profiles,
  editingId,
  onClose,
  onSaved
}: ProfileDialogProps): React.JSX.Element | null {
  const { t } = useTranslation()
  const [form, setForm] = useState<ProfileForm>(emptyForm())
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (editingId) {
      const profile = profiles.find((item) => item.id === editingId)
      if (profile) {
        setForm({
          id: profile.id,
          name: profile.name,
          provider: profile.provider,
          accessKeyId: profile.accessKeyId,
          secretAccessKey: '',
          region: profile.region,
          namespace: profile.namespace ?? '',
          manualBucketsText: (profile.manualBuckets ?? []).join('\n')
        })
      }
    } else {
      setForm(emptyForm())
    }
    setError(null)
    setMessage(null)
  }, [open, editingId, profiles])

  if (!open) return null

  const update = (partial: Partial<ProfileForm>): void => {
    setForm((current) => ({ ...current, ...partial }))
  }

  const buildPayload = () => ({
    id: form.id,
    name: form.name.trim(),
    provider: form.provider,
    accessKeyId: form.accessKeyId.trim(),
    secretAccessKey: form.secretAccessKey.trim() || undefined,
    region: form.region.trim(),
    namespace: form.provider === 'oracle' ? form.namespace.trim() : undefined,
    manualBuckets:
      form.provider === 'oracle'
        ? form.manualBucketsText
            .split(/[\n,]/)
            .map((item) => item.trim())
            .filter(Boolean)
        : undefined
  })

  const validate = (): void => {
    if (!form.name.trim()) throw new AppError('errors.profile.nameRequired')
    if (!form.accessKeyId.trim()) throw new AppError('errors.profile.accessKeyRequired')
    if (!form.secretAccessKey.trim() && !form.id) {
      throw new AppError('errors.profile.secretRequired')
    }
    if (form.provider === 'oracle' && !form.namespace.trim()) {
      throw new AppError('errors.profile.namespaceRequired')
    }
  }

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    setError(null)
    try {
      validate()
      await window.api.profiles.save(buildPayload())
      onSaved()
      onClose()
    } catch (err) {
      setError(translateError(err, t))
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (): Promise<void> => {
    setTesting(true)
    setError(null)
    setMessage(null)
    try {
      if (!form.accessKeyId.trim()) throw new AppError('errors.profile.accessKeyRequired')
      if (!form.secretAccessKey.trim() && !form.id) {
        throw new AppError('errors.profile.secretForTest')
      }
      if (form.provider === 'oracle' && !form.namespace.trim()) {
        throw new AppError('errors.profile.namespaceRequired')
      }

      let profileId = form.id
      if (!profileId || form.secretAccessKey.trim()) {
        const saved = await window.api.profiles.save({
          ...buildPayload(),
          name: form.name.trim() || 'Test'
        })
        profileId = saved.id
        update({ id: saved.id })
      }

      await window.api.s3.testConnection(profileId!)
      setMessage(t('profile.testSuccess'))
    } catch (err) {
      setError(translateError(err, t))
    } finally {
      setTesting(false)
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    await window.api.profiles.delete(id)
    onSaved()
    if (form.id === id) setForm(emptyForm())
  }

  const startEdit = (profile: StorageProfilePublic): void => {
    setForm({
      id: profile.id,
      name: profile.name,
      provider: profile.provider,
      accessKeyId: profile.accessKeyId,
      secretAccessKey: '',
      region: profile.region,
      namespace: profile.namespace ?? '',
      manualBucketsText: (profile.manualBuckets ?? []).join('\n')
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl border border-slate-600 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-100">
            {editingId ? t('profile.editTitle') : t('profile.title')}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-200">
            ✕
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-400">{t('profile.name')}</span>
              <input
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 outline-none focus:border-sky-500/60"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-400">{t('profile.provider')}</span>
              <select
                value={form.provider}
                onChange={(e) => update({ provider: e.target.value as Provider })}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 outline-none focus:border-sky-500/60"
              >
                <option value="aws">{t('profile.aws')}</option>
                <option value="oracle">{t('profile.oracle')}</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-400">{t('profile.accessKey')}</span>
              <input
                value={form.accessKeyId}
                onChange={(e) => update({ accessKeyId: e.target.value })}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 outline-none focus:border-sky-500/60"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-400">
                {t('profile.secretKey')} {form.id ? t('profile.secretKeep') : ''}
              </span>
              <input
                type="password"
                value={form.secretAccessKey}
                onChange={(e) => update({ secretAccessKey: e.target.value })}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 outline-none focus:border-sky-500/60"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-400">{t('profile.region')}</span>
              <input
                value={form.region}
                onChange={(e) => update({ region: e.target.value })}
                placeholder={
                  form.provider === 'aws'
                    ? t('profile.regionPlaceholderAws')
                    : t('profile.regionPlaceholderOracle')
                }
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 outline-none focus:border-sky-500/60"
              />
            </label>
            {form.provider === 'oracle' && (
              <label className="block text-sm">
                <span className="mb-1 block text-slate-400">{t('profile.namespace')}</span>
                <input
                  value={form.namespace}
                  onChange={(e) => update({ namespace: e.target.value })}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 outline-none focus:border-sky-500/60"
                />
              </label>
            )}
          </div>

          {form.provider === 'oracle' && (
            <label className="block text-sm">
              <span className="mb-1 block text-slate-400">{t('profile.manualBuckets')}</span>
              <textarea
                value={form.manualBucketsText}
                onChange={(e) => update({ manualBucketsText: e.target.value })}
                rows={3}
                placeholder={t('profile.manualBucketsPlaceholder')}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 font-mono text-sm outline-none focus:border-sky-500/60"
              />
            </label>
          )}

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
              {message}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setForm(emptyForm())}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700"
            >
              {t('common.newProfile')}
            </button>
            <button
              type="button"
              onClick={() => void handleTest()}
              disabled={testing}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600 disabled:opacity-50"
            >
              {testing ? t('profile.testing') : t('profile.testConnection')}
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm hover:bg-emerald-600 disabled:opacity-50"
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>

          {profiles.length > 0 && (
            <div className="border-t border-slate-700 pt-4">
              <h4 className="mb-2 text-sm font-medium text-slate-300">{t('profile.savedList')}</h4>
              <ul className="space-y-1.5">
                {profiles.map((profile) => (
                  <li
                    key={profile.id}
                    className="flex items-center justify-between rounded-lg bg-slate-800/80 px-3 py-2.5 text-sm"
                  >
                    <span className="min-w-0 truncate text-slate-200">
                      {profile.name}{' '}
                      <span className="text-slate-500">
                        — {profile.provider.toUpperCase()} ({profile.region})
                      </span>
                    </span>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(profile)}
                        className="text-xs text-slate-400 hover:text-slate-200"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(profile.id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

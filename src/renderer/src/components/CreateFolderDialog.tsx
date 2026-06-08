import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppError } from '../../../shared/app-error'
import { joinS3Path } from '../utils/format'
import { buildFolderKey } from '../utils/prefix'
import { translateError } from '../utils/translateError'

interface CreateFolderDialogProps {
  open: boolean
  bucket: string
  parentPrefix: string
  onClose: () => void
  onCreate: (folderName: string) => Promise<void>
}

export function CreateFolderDialog({
  open,
  bucket,
  parentPrefix,
  onClose,
  onCreate
}: CreateFolderDialogProps): React.JSX.Element | null {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName('')
    setError(null)
    setSaving(false)
  }, [open])

  if (!open) return null

  const handleSubmit = async (): Promise<void> => {
    setSaving(true)
    setError(null)
    try {
      if (!name.trim()) throw new AppError('errors.folderNameRequired')
      await onCreate(name.trim())
      onClose()
    } catch (err) {
      setError(translateError(err, t))
    } finally {
      setSaving(false)
    }
  }

  const previewPath = name.trim()
    ? joinS3Path(bucket, buildFolderKey(parentPrefix, name.trim()))
    : joinS3Path(bucket, parentPrefix || '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-slate-600 bg-slate-900 p-5 shadow-2xl">
        <h3 className="mb-4 text-lg font-semibold text-slate-100">{t('createFolder.title')}</h3>

        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-slate-400">{t('createFolder.nameLabel')}</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleSubmit()}
            placeholder={t('createFolder.namePlaceholder')}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-sky-500/60"
          />
        </label>

        <p className="mb-4 text-xs text-slate-500">
          {t('createFolder.preview')}{' '}
          <span className="break-all text-slate-300">{previewPath}</span>
        </p>

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm hover:bg-emerald-600 disabled:opacity-50"
          >
            {saving ? t('common.creating') : t('common.create')}
          </button>
        </div>
      </div>
    </div>
  )
}

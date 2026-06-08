import { useTranslation } from 'react-i18next'
import { joinS3Path } from '../utils/format'

interface ConfirmItem {
  sourceKey: string
  destKey: string
  isFolder: boolean
  label: string
}

interface ConfirmTransferDialogProps {
  open: boolean
  sourceBucket: string
  destBucket: string
  items: ConfirmItem[]
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmTransferDialog({
  open,
  sourceBucket,
  destBucket,
  items,
  onConfirm,
  onCancel
}: ConfirmTransferDialogProps): React.JSX.Element | null {
  const { t } = useTranslation()
  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-slate-600 bg-slate-900 p-5 shadow-2xl">
        <h3 className="mb-3 text-lg font-semibold text-slate-100">{t('confirmTransfer.title')}</h3>
        <p className="mb-4 text-sm text-slate-400">{t('confirmTransfer.description')}</p>
        <ul className="mb-4 max-h-48 space-y-2 overflow-auto text-sm">
          {items.map((item) => (
            <li key={item.sourceKey} className="rounded-lg bg-slate-800/80 px-3 py-2.5">
              <div className="font-medium text-slate-300">{item.label}</div>
              <div className="truncate text-xs text-slate-500">
                {joinS3Path(sourceBucket, item.sourceKey)}
              </div>
              <div className="truncate text-xs text-emerald-400">
                → {joinS3Path(destBucket, item.destKey)}
              </div>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm hover:bg-emerald-600"
          >
            {t('common.transfer')}
          </button>
        </div>
      </div>
    </div>
  )
}

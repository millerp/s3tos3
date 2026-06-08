import { useTranslation } from 'react-i18next'
import type { BatchProgress } from '../../../shared/types'
import { formatBytes } from '../utils/format'

interface TransferPanelProps {
  batch: BatchProgress | null
  onCancel: () => void
}

export function TransferPanel({ batch, onCancel }: TransferPanelProps): React.JSX.Element {
  const { t } = useTranslation()

  if (!batch) {
    return (
      <div className="border-t border-slate-700/80 bg-slate-950/80 px-5 py-3 text-sm text-slate-500">
        {t('transfer.idle')}
      </div>
    )
  }

  const percent =
    batch.totalBytes > 0 ? Math.min(100, (batch.bytesTransferred / batch.totalBytes) * 100) : 0

  const failedJobs = batch.jobs.filter((job) => job.status === 'failed')
  const statusLabel = t(`transfer.status.${batch.status}`)

  return (
    <div className="border-t border-slate-700/80 bg-slate-950/80 px-5 py-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-200">
          <span>
            {t('transfer.progress', { done: batch.completedJobs, total: batch.totalJobs })}
          </span>
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
            {statusLabel}
          </span>
          {batch.failedJobs > 0 && (
            <span className="text-xs text-red-400">
              {t('transfer.failures', { count: batch.failedJobs })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums text-slate-400">
            {formatBytes(batch.bytesTransferred)}
            {batch.totalBytes > 0 && ` / ${formatBytes(batch.totalBytes)}`}
          </span>
          {batch.status === 'running' && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg bg-red-900/50 px-3 py-1 text-xs text-red-200 transition-colors hover:bg-red-800/60"
            >
              {t('transfer.cancel')}
            </button>
          )}
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            batch.status === 'failed'
              ? 'bg-red-500'
              : batch.status === 'completed'
                ? 'bg-emerald-500'
                : 'bg-sky-500'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {failedJobs.length > 0 && (
        <div className="mt-2 max-h-20 overflow-auto rounded-lg bg-red-500/5 p-2 text-xs text-red-300">
          {failedJobs.slice(0, 5).map((job) => (
            <div key={job.id} className="truncate">
              {job.sourceKey}: {job.error}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

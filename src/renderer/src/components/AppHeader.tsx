import { useTranslation } from 'react-i18next'
import type { BatchProgress } from '../../../shared/types'
import { LanguageSwitcher } from './LanguageSwitcher'

interface AppHeaderProps {
  batch: BatchProgress | null
  onOpenProfiles: () => void
}

export function AppHeader({ batch, onOpenProfiles }: AppHeaderProps): React.JSX.Element {
  const { t } = useTranslation()
  const isTransferring = batch?.status === 'running'

  return (
    <header className="flex items-center justify-between gap-4 border-b border-slate-700/80 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-5 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600/20 text-sm font-bold text-sky-400">
            S3
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-100">{t('app.title')}</h1>
            <p className="text-xs text-slate-500">{t('app.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline ${
            isTransferring
              ? 'bg-amber-500/15 text-amber-300'
              : 'bg-emerald-500/15 text-emerald-300'
          }`}
        >
          {isTransferring ? t('header.transferring') : t('header.ready')}
        </span>

        <LanguageSwitcher />

        <button
          type="button"
          onClick={onOpenProfiles}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700"
        >
          {t('header.profiles')}
        </button>
      </div>
    </header>
  )
}

import { useTranslation } from 'react-i18next'

interface BreadcrumbProps {
  prefix: string
  onNavigate: (prefix: string) => void
}

export function Breadcrumb({ prefix, onNavigate }: BreadcrumbProps): React.JSX.Element {
  const { t } = useTranslation()
  const segments = prefix ? prefix.replace(/\/$/, '').split('/') : []

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-xs text-slate-400">
      <button
        type="button"
        onClick={() => onNavigate('')}
        className="shrink-0 rounded px-1.5 py-0.5 hover:bg-slate-700/80 hover:text-slate-200"
      >
        {t('common.root')}
      </button>
      {segments.map((segment, index) => {
        const path = `${segments.slice(0, index + 1).join('/')}/`
        return (
          <span key={path} className="flex min-w-0 items-center gap-1">
            <span className="text-slate-600">/</span>
            <button
              type="button"
              onClick={() => onNavigate(path)}
              className="truncate rounded px-1.5 py-0.5 hover:bg-slate-700/80 hover:text-slate-200"
            >
              {segment}
            </button>
          </span>
        )
      })}
    </div>
  )
}

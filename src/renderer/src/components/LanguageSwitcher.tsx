import { useTranslation } from 'react-i18next'
import { setAppLanguage, type AppLanguage } from '../i18n'

export function LanguageSwitcher(): React.JSX.Element {
  const { i18n, t } = useTranslation()

  const change = (language: AppLanguage): void => {
    setAppLanguage(language)
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/80 p-0.5">
      <span className="sr-only">{t('language.label')}</span>
      {(['pt-BR', 'en'] as AppLanguage[]).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => change(lang)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            i18n.language === lang
              ? 'bg-slate-700 text-slate-100'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {lang === 'pt-BR' ? 'PT' : 'EN'}
        </button>
      ))}
    </div>
  )
}

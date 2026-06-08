import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import ptBR from './locales/pt-BR.json'

export const SUPPORTED_LANGUAGES = ['pt-BR', 'en'] as const
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]

const STORAGE_KEY = 's3tos3-language'

function detectLanguage(): AppLanguage {
  const stored = localStorage.getItem(STORAGE_KEY) as AppLanguage | null
  if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
    return stored
  }

  const browser = navigator.language.toLowerCase()
  if (browser.startsWith('pt')) return 'pt-BR'
  return 'en'
}

void i18n.use(initReactI18next).init({
  resources: {
    'pt-BR': { translation: ptBR },
    en: { translation: en }
  },
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
})

export function setAppLanguage(language: AppLanguage): void {
  localStorage.setItem(STORAGE_KEY, language)
  void i18n.changeLanguage(language)
}

export default i18n

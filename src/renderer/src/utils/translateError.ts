import type { TFunction } from 'i18next'
import { parseAppError } from '../../../shared/app-error'

export function translateError(error: unknown, t: TFunction): string {
  const parsed = parseAppError(error)
  if (parsed) {
    return t(parsed.code, { ...(parsed.params ?? {}), defaultValue: parsed.code })
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return t('errors.unknown')
}

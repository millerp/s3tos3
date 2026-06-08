export interface AppErrorPayload {
  code: string
  params?: Record<string, string>
}

export class AppError extends Error {
  readonly code: string
  readonly params: Record<string, string>

  constructor(code: string, params: Record<string, string> = {}) {
    super(JSON.stringify({ code, params }))
    this.name = 'AppError'
    this.code = code
    this.params = params
  }
}

export function parseAppError(error: unknown): AppErrorPayload | null {
  if (!(error instanceof Error)) return null
  try {
    const parsed = JSON.parse(error.message) as AppErrorPayload
    if (parsed?.code) return parsed
  } catch {
    // not a structured app error
  }
  return null
}

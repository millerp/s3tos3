import { useToastStore } from '../stores/toastStore'

export function Toast(): React.JSX.Element | null {
  const message = useToastStore((state) => state.message)
  if (!message) return null

  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-100 shadow-xl">
      {message}
    </div>
  )
}

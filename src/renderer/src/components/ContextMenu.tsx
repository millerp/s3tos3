import { useEffect, useRef } from 'react'

export interface ContextMenuItem {
  id: string
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    const handleClick = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKey)
    window.addEventListener('mousedown', handleClick)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  useEffect(() => {
    const menu = ref.current
    if (!menu) return

    const rect = menu.getBoundingClientRect()
    const maxX = window.innerWidth - rect.width - 8
    const maxY = window.innerHeight - rect.height - 8
    menu.style.left = `${Math.min(x, maxX)}px`
    menu.style.top = `${Math.min(y, maxY)}px`
  }, [x, y])

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-48 rounded-lg border border-slate-600 bg-slate-900 py-1 shadow-xl"
      style={{ left: x, top: y }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          disabled={item.disabled}
          onClick={() => {
            if (!item.disabled) {
              item.onClick()
              onClose()
            }
          }}
          className={`block w-full px-3 py-1.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
            item.danger
              ? 'text-red-300 hover:bg-red-900/40'
              : 'text-slate-200 hover:bg-slate-800'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

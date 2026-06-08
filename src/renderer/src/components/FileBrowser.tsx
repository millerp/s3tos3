import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { S3ObjectItem } from '../../../shared/types'
import { useToastStore } from '../stores/toastStore'
import { formatBytes, joinS3Path } from '../utils/format'
import { parentPrefix } from '../utils/prefix'
import { Breadcrumb } from './Breadcrumb'
import { ContextMenu, type ContextMenuItem } from './ContextMenu'

interface FileBrowserProps {
  side: 'source' | 'dest'
  bucket: string
  prefix: string
  items: S3ObjectItem[]
  loading: boolean
  error: string | null
  draggable?: boolean
  droppable?: boolean
  canTransfer?: boolean
  onNavigate: (prefix: string) => void
  onRefresh: () => void
  onDropItems?: (items: S3ObjectItem[], targetPrefix: string) => void
  onTransferItems?: (items: S3ObjectItem[]) => void
  onCreateFolder?: (parentPrefix: string) => void
}

interface MenuState {
  x: number
  y: number
  items: ContextMenuItem[]
}

function Spinner(): React.JSX.Element {
  return (
    <span className="inline-block h-4 w-4 animate-spin-slow rounded-full border-2 border-slate-600 border-t-sky-400" />
  )
}

export function FileBrowser({
  side,
  bucket,
  prefix,
  items,
  loading,
  error,
  draggable = false,
  droppable = false,
  canTransfer = false,
  onNavigate,
  onRefresh,
  onDropItems,
  onTransferItems,
  onCreateFolder
}: FileBrowserProps): React.JSX.Element {
  const { t } = useTranslation()
  const showToast = useToastStore((state) => state.show)
  const [dragOverPrefix, setDragOverPrefix] = useState<string | null>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)

  const closeMenu = useCallback(() => setMenu(null), [])

  const copyToClipboard = useCallback(
    async (text: string): Promise<void> => {
      await navigator.clipboard.writeText(text)
      showToast(t('common.copied'))
    },
    [showToast, t]
  )

  const openItemMenu = useCallback(
    (event: React.MouseEvent, item: S3ObjectItem): void => {
      event.preventDefault()
      const s3Path = joinS3Path(bucket, item.key)
      const menuItems: ContextMenuItem[] = []

      if (item.isFolder) {
        menuItems.push({
          id: 'open',
          label: t('contextMenu.openFolder'),
          onClick: () => onNavigate(item.key)
        })
        if (bucket && onCreateFolder) {
          menuItems.push({
            id: 'new-folder-here',
            label: t('contextMenu.newFolderHere'),
            onClick: () => onCreateFolder(item.key)
          })
        }
      }

      if (canTransfer && onTransferItems) {
        menuItems.push({
          id: 'transfer',
          label: item.isFolder
            ? t('contextMenu.transferFolder')
            : t('contextMenu.transferFile'),
          onClick: () => onTransferItems([item])
        })
      }

      menuItems.push({
        id: 'copy-path',
        label: t('contextMenu.copyS3Path'),
        onClick: () => void copyToClipboard(s3Path)
      })

      if (!item.isFolder) {
        menuItems.push({
          id: 'copy-key',
          label: t('contextMenu.copyObjectKey'),
          onClick: () => void copyToClipboard(item.key)
        })
      }

      setMenu({ x: event.clientX, y: event.clientY, items: menuItems })
    },
    [bucket, canTransfer, copyToClipboard, onCreateFolder, onNavigate, onTransferItems, t]
  )

  const openPaneMenu = useCallback(
    (event: React.MouseEvent): void => {
      event.preventDefault()
      const parent = parentPrefix(prefix)
      const menuItems: ContextMenuItem[] = [
        { id: 'refresh', label: t('contextMenu.refresh'), onClick: onRefresh }
      ]

      if (bucket && onCreateFolder) {
        menuItems.push({
          id: 'new-folder',
          label: t('contextMenu.newFolder'),
          onClick: () => onCreateFolder(prefix)
        })
      }

      if (prefix) {
        menuItems.push({
          id: 'up',
          label: t('contextMenu.goUp'),
          onClick: () => onNavigate(parent)
        })
        menuItems.push({
          id: 'copy-current',
          label: t('contextMenu.copyCurrentPath'),
          onClick: () => void copyToClipboard(joinS3Path(bucket, prefix))
        })
      }

      if (canTransfer && onTransferItems && prefix) {
        menuItems.push({
          id: 'transfer-current',
          label: t('contextMenu.transferCurrent'),
          onClick: () =>
            onTransferItems([
              {
                key: prefix,
                name: prefix.replace(/\/$/, '').split('/').pop() ?? prefix,
                isFolder: true
              }
            ])
        })
      }

      if (side === 'dest' && droppable) {
        menuItems.push({
          id: 'hint',
          label: t('contextMenu.dropHint'),
          onClick: () => undefined,
          disabled: true
        })
      }

      setMenu({ x: event.clientX, y: event.clientY, items: menuItems })
    },
    [
      bucket,
      canTransfer,
      copyToClipboard,
      droppable,
      onCreateFolder,
      onNavigate,
      onRefresh,
      onTransferItems,
      prefix,
      side,
      t
    ]
  )

  const handleDragStart = (event: React.DragEvent, item: S3ObjectItem): void => {
    if (!draggable) return
    event.dataTransfer.setData('application/x-s3-item', JSON.stringify(item))
    event.dataTransfer.effectAllowed = 'copy'
  }

  const handleDrop = (event: React.DragEvent, targetPrefix: string): void => {
    if (!droppable || !onDropItems) return
    event.preventDefault()
    setDragOverPrefix(null)
    const raw = event.dataTransfer.getData('application/x-s3-item')
    if (!raw) return
    try {
      onDropItems([JSON.parse(raw) as S3ObjectItem], targetPrefix)
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex h-full flex-col bg-slate-900/30">
      <div className="flex items-center gap-2 border-b border-slate-700/60 px-3 py-2">
        <Breadcrumb prefix={prefix} onNavigate={onNavigate} />
        <div className="flex shrink-0 gap-1">
          {bucket && onCreateFolder && (
            <button
              type="button"
              onClick={() => onCreateFolder(prefix)}
              className="rounded-md px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            >
              + {t('browser.newFolder')}
            </button>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={!bucket || loading}
            className="rounded-md px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40"
          >
            {t('common.refresh')}
          </button>
        </div>
      </div>

      <div
        className={`flex-1 overflow-auto transition-colors ${
          dragOverPrefix === prefix ? 'bg-emerald-500/10' : ''
        }`}
        onContextMenu={openPaneMenu}
        onDragOver={(event) => {
          if (!droppable) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
          setDragOverPrefix(prefix)
        }}
        onDragLeave={() => setDragOverPrefix(null)}
        onDrop={(event) => handleDrop(event, prefix)}
      >
        {loading && (
          <div className="flex items-center gap-2 p-6 text-sm text-slate-400">
            <Spinner />
            {t('browser.loading')}
          </div>
        )}

        {error && (
          <div className="m-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 p-10 text-center text-sm text-slate-500">
            <span className="text-3xl opacity-40">{droppable ? '📥' : '📂'}</span>
            <p>{droppable ? t('browser.emptyDest') : t('browser.emptySource')}</p>
          </div>
        )}

        <ul className="py-1">
          {items.map((item) => (
            <li
              key={item.key}
              draggable={draggable}
              onDragStart={(event) => handleDragStart(event, item)}
              onDoubleClick={() => item.isFolder && onNavigate(item.key)}
              onContextMenu={(event) => {
                event.stopPropagation()
                openItemMenu(event, item)
              }}
              onDragOver={(event) => {
                if (!droppable || !item.isFolder) return
                event.preventDefault()
                event.stopPropagation()
                setDragOverPrefix(item.key)
              }}
              onDragLeave={() => setDragOverPrefix(null)}
              onDrop={(event) => {
                if (!item.isFolder) return
                event.stopPropagation()
                handleDrop(event, item.key)
              }}
              className={`group mx-2 flex cursor-default items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-slate-800/80 ${
                dragOverPrefix === item.key ? 'bg-emerald-500/15 ring-1 ring-emerald-500/30' : ''
              } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-base ${
                  item.isFolder ? 'bg-amber-500/15' : 'bg-slate-700/50'
                }`}
              >
                {item.isFolder ? '📁' : '📄'}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-slate-200">{item.name}</span>
              {!item.isFolder && (
                <span className="shrink-0 text-xs tabular-nums text-slate-500">
                  {formatBytes(item.size ?? 0)}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={closeMenu} />}
    </div>
  )
}

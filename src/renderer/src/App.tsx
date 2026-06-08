import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppError } from '../../shared/app-error'
import type { S3ObjectItem } from '../../shared/types'
import { AppHeader } from './components/AppHeader'
import { ConnectionBar } from './components/ConnectionBar'
import { ConfirmTransferDialog } from './components/ConfirmTransferDialog'
import { CreateFolderDialog } from './components/CreateFolderDialog'
import { FileBrowser } from './components/FileBrowser'
import { ProfileDialog } from './components/ProfileDialog'
import { Toast } from './components/Toast'
import { TransferPanel } from './components/TransferPanel'
import { useS3Browser } from './hooks/useS3Browser'
import { useTransfer } from './hooks/useTransfer'
import { useAppStore } from './stores/appStore'
import { resolveDestKey } from './utils/transfer'

function App(): React.JSX.Element {
  const { t } = useTranslation()
  const profiles = useAppStore((state) => state.profiles)
  const source = useAppStore((state) => state.source)
  const dest = useAppStore((state) => state.dest)
  const batch = useAppStore((state) => state.batch)
  const showProfileDialog = useAppStore((state) => state.showProfileDialog)
  const editingProfileId = useAppStore((state) => state.editingProfileId)
  const confirmTransfer = useAppStore((state) => state.confirmTransfer)
  const setProfiles = useAppStore((state) => state.setProfiles)
  const setShowProfileDialog = useAppStore((state) => state.setShowProfileDialog)
  const setConfirmTransfer = useAppStore((state) => state.setConfirmTransfer)

  const sourceBrowser = useS3Browser('source')
  const destBrowser = useS3Browser('dest')
  const { cancelTransfer } = useTransfer()
  const [createFolderTarget, setCreateFolderTarget] = useState<{
    side: 'source' | 'dest'
    parentPrefix: string
  } | null>(null)

  const loadProfiles = useCallback(async () => {
    const list = await window.api.profiles.list()
    setProfiles(list)
  }, [setProfiles])

  useEffect(() => {
    void loadProfiles()
  }, [loadProfiles])

  const startTransfer = (items: S3ObjectItem[], targetPrefix: string): void => {
    if (!source.profileId || !source.bucket || !dest.profileId || !dest.bucket) {
      return
    }

    const confirmItems = items.map((item) => ({
      sourceKey: item.key,
      destKey: resolveDestKey(targetPrefix, item.key, item.isFolder),
      isFolder: item.isFolder,
      label: item.isFolder ? `${item.name}/` : item.name
    }))

    setConfirmTransfer({ items: confirmItems, destPrefix: targetPrefix })
  }

  const handleDrop = (items: S3ObjectItem[], targetPrefix: string): void => {
    startTransfer(items, targetPrefix)
  }

  const handleTransferFromSource = (items: S3ObjectItem[]): void => {
    startTransfer(items, dest.prefix)
  }

  const createFolderPane = createFolderTarget?.side === 'source' ? source : dest
  const createFolderBrowser =
    createFolderTarget?.side === 'source' ? sourceBrowser : destBrowser

  const openCreateFolder = (side: 'source' | 'dest', parentPrefix: string): void => {
    setCreateFolderTarget({ side, parentPrefix })
  }

  const handleCreateFolder = async (folderName: string): Promise<void> => {
    if (!createFolderTarget || !createFolderPane.profileId || !createFolderPane.bucket) {
      throw new AppError('errors.createFolderSetup')
    }

    await window.api.s3.createFolder(
      createFolderPane.profileId,
      createFolderPane.bucket,
      createFolderTarget.parentPrefix,
      folderName
    )
    await createFolderBrowser.refresh()
  }

  const handleConfirmTransfer = async (): Promise<void> => {
    if (!confirmTransfer) return

    const transferItems = confirmTransfer.items.map((item) => ({
      sourceKey: item.sourceKey,
      destKey: item.destKey,
      isFolder: item.isFolder
    }))

    const destPrefix = confirmTransfer.destPrefix
    setConfirmTransfer(null)

    await window.api.transfer.start({
      sourceProfileId: source.profileId,
      sourceBucket: source.bucket,
      destProfileId: dest.profileId,
      destBucket: dest.bucket,
      destPrefix,
      items: transferItems
    })
  }

  return (
    <div className="flex h-full flex-col">
      <AppHeader batch={batch} onOpenProfiles={() => setShowProfileDialog(true)} />

      <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-slate-700/80">
        <section className="flex min-h-0 flex-col">
          <ConnectionBar
            title={t('pane.source')}
            profiles={profiles}
            profileId={source.profileId}
            bucket={source.bucket}
            onProfileChange={sourceBrowser.selectProfile}
            onBucketChange={sourceBrowser.selectBucket}
            accentClass="border-t-2 border-t-sky-500/80"
          />
          <div className="min-h-0 flex-1">
            <FileBrowser
              side="source"
              bucket={source.bucket}
              prefix={source.prefix}
              items={source.items}
              loading={source.loading}
              error={source.error}
              draggable
              canTransfer={Boolean(dest.profileId && dest.bucket)}
              onNavigate={sourceBrowser.navigateTo}
              onRefresh={sourceBrowser.refresh}
              onTransferItems={handleTransferFromSource}
              onCreateFolder={
                source.bucket
                  ? (parentPrefix) => openCreateFolder('source', parentPrefix)
                  : undefined
              }
            />
          </div>
        </section>

        <section className="flex min-h-0 flex-col">
          <ConnectionBar
            title={t('pane.dest')}
            profiles={profiles}
            profileId={dest.profileId}
            bucket={dest.bucket}
            onProfileChange={destBrowser.selectProfile}
            onBucketChange={destBrowser.selectBucket}
            accentClass="border-t-2 border-t-emerald-500/80"
          />
          <div className="min-h-0 flex-1">
            <FileBrowser
              side="dest"
              bucket={dest.bucket}
              prefix={dest.prefix}
              items={dest.items}
              loading={dest.loading}
              error={dest.error}
              droppable
              onNavigate={destBrowser.navigateTo}
              onRefresh={destBrowser.refresh}
              onDropItems={handleDrop}
              onCreateFolder={
                dest.bucket ? (parentPrefix) => openCreateFolder('dest', parentPrefix) : undefined
              }
            />
          </div>
        </section>
      </div>

      <TransferPanel batch={batch} onCancel={cancelTransfer} />
      <Toast />

      <ProfileDialog
        open={showProfileDialog}
        profiles={profiles}
        editingId={editingProfileId}
        onClose={() => setShowProfileDialog(false)}
        onSaved={loadProfiles}
      />

      <CreateFolderDialog
        open={Boolean(createFolderTarget)}
        bucket={createFolderPane.bucket}
        parentPrefix={createFolderTarget?.parentPrefix ?? ''}
        onClose={() => setCreateFolderTarget(null)}
        onCreate={handleCreateFolder}
      />

      <ConfirmTransferDialog
        open={Boolean(confirmTransfer)}
        sourceBucket={source.bucket}
        destBucket={dest.bucket}
        items={confirmTransfer?.items ?? []}
        onConfirm={handleConfirmTransfer}
        onCancel={() => setConfirmTransfer(null)}
      />
    </div>
  )
}

export default App

import { create } from 'zustand'
import type { BatchProgress, S3ObjectItem, StorageProfilePublic } from '../../../shared/types'

export interface PaneState {
  profileId: string
  bucket: string
  prefix: string
  items: S3ObjectItem[]
  loading: boolean
  error: string | null
}

interface AppState {
  profiles: StorageProfilePublic[]
  source: PaneState
  dest: PaneState
  batch: BatchProgress | null
  showProfileDialog: boolean
  editingProfileId: string | null
  confirmTransfer: {
    items: Array<{ sourceKey: string; destKey: string; isFolder: boolean; label: string }>
    destPrefix: string
  } | null
  setProfiles: (profiles: StorageProfilePublic[]) => void
  setPane: (side: 'source' | 'dest', partial: Partial<PaneState>) => void
  setBatch: (batch: BatchProgress | null) => void
  setShowProfileDialog: (show: boolean, editingId?: string | null) => void
  setConfirmTransfer: (value: AppState['confirmTransfer']) => void
}

const emptyPane = (): PaneState => ({
  profileId: '',
  bucket: '',
  prefix: '',
  items: [],
  loading: false,
  error: null
})

export const useAppStore = create<AppState>((set) => ({
  profiles: [],
  source: emptyPane(),
  dest: emptyPane(),
  batch: null,
  showProfileDialog: false,
  editingProfileId: null,
  confirmTransfer: null,
  setProfiles: (profiles) => set({ profiles }),
  setPane: (side, partial) =>
    set((state) => ({
      [side]: { ...state[side], ...partial }
    })),
  setBatch: (batch) => set({ batch }),
  setShowProfileDialog: (show, editingId = null) =>
    set({ showProfileDialog: show, editingProfileId: editingId }),
  setConfirmTransfer: (value) => set({ confirmTransfer: value })
}))

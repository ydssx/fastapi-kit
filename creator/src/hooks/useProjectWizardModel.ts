import type { ReactNode } from 'react'
import type { DraftSaveStatus } from '../components/StepEditorPanel'
import type { QuotaLimitKind } from '../components/QuotaLimitNotice'
import type { UsedImageAsset } from '../components/ImageAssetPreview'
import type { SelectionRewriteController } from './useSelectionRewrite'
import type { TextSelection } from '../lib/editorSelection'
import type {
  AiVariant,
  BrandProfile,
  MediaAsset,
  Pipeline,
  Project,
  PublishChecklistItem,
} from '../types/api'

/** Grouped view-model for the in-progress project wizard (avoids 40+ flat props). */
export interface ProjectWizardModel {
  project: Project
  pipeline: Pipeline | undefined
  step: Pipeline['steps'][number] | undefined
  stepIndex: number
  brand: BrandProfile
  isPublish: boolean
  canEditPlatforms: boolean
  draftWarning: string | null

  editTitle: string
  setEditTitle: (value: string) => void
  onSaveTitle: () => void
  editPlatforms: string[]
  editPrimaryPlatform: string
  onEditPlatformsChange: (next: string[]) => void
  onEditPrimaryChange: (key: string) => void

  content: string
  setContent: (value: string) => void
  editorSelection: TextSelection | null
  setEditorSelection: (value: TextSelection | null) => void
  draftStatus: DraftSaveStatus
  onSaveDraft: () => void
  onConfirm: () => void
  savingDraft: boolean
  confirming: boolean

  aiPending: boolean
  suggestion: string | null
  variants: AiVariant[]
  onAdoptAll: (text: string) => void
  onInsert: (text: string) => void
  onReplaceSelection: (text: string) => void
  onRegenerate: () => void
  onAdjust: (adj: string) => void
  selectionRewrite?: SelectionRewriteController

  checklist: PublishChecklistItem[]
  onToggleCheck: (item: PublishChecklistItem) => void
  onComplete: () => void
  completing: boolean

  onStepOpen: (stepKey: string) => void
  openingStepKey: string | null
  prevCtx: { title?: string; summary?: string }

  quotaError: QuotaLimitKind | null
  actionError: string | null

  usedImageAssets: UsedImageAsset[]
  onRemoveAsset: (item: UsedImageAsset) => void
  removingAssociationId: string | null
  assetPickerOpen: boolean
  onCloseAssetPicker: () => void
  onPickImage: () => void
  onSelectAsset: (asset: MediaAsset) => void
  addingImage: boolean
  stepTitle: (key: string) => string

  moreMenu: ReactNode
  dialog: ReactNode
}

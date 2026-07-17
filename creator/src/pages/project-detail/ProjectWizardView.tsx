import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AiSuggestionPanel } from '../../components/AiSuggestionPanel'
import { ContextChips } from '../../components/ContextChips'
import { ImageAssetPicker } from '../../components/ImageAssetPicker'
import {
  ImageAssetPreview,
  type UsedImageAsset,
} from '../../components/ImageAssetPreview'
import { PlatformPicker } from '../../components/PlatformPicker'
import { PublishChecklist } from '../../components/PublishChecklist'
import { QuotaLimitNotice, type QuotaLimitKind } from '../../components/QuotaLimitNotice'
import { SelectionRewriteFloat } from '../../components/SelectionRewriteFloat'
import { StepEditorPanel, type DraftSaveStatus } from '../../components/StepEditorPanel'
import { StepProgress } from '../../components/StepProgress'
import { StepWorkspace } from '../../components/StepWorkspace'
import { StepVersionHistory } from '../../components/StepVersionHistory'
import { CREATOR_PLATFORMS } from '../../lib/platforms'
import { pipelineLabel, platformLabels } from '../../lib/labels'
import { adjustmentsForStep } from '../../lib/stepAiAdjustments'
import {
  captureSelection,
  hasActiveSelection,
  type TextSelection,
} from '../../lib/editorSelection'
import type {
  AiVariant,
  BrandProfile,
  MediaAsset,
  Pipeline,
  Project,
  PublishChecklistItem,
} from '../../types/api'
import shared from '../../styles/shared.module.css'
import styles from '../ProjectDetailPage.module.css'

interface ProjectWizardViewProps {
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
  selectionRewrite?: {
    showFloat: boolean
    chips: { label: string; adjustment: string }[]
    loading: boolean
    preview: string | null
    locked: boolean
    onRewrite: (adjustment: string) => void
    onConfirm: () => void
    onCancel: () => void
  }
}

export function ProjectWizardView({
  project,
  pipeline,
  step,
  stepIndex,
  brand,
  isPublish,
  canEditPlatforms,
  draftWarning,
  editTitle,
  setEditTitle,
  onSaveTitle,
  editPlatforms,
  editPrimaryPlatform,
  onEditPlatformsChange,
  onEditPrimaryChange,
  content,
  setContent,
  editorSelection,
  setEditorSelection,
  draftStatus,
  onSaveDraft,
  onConfirm,
  savingDraft,
  confirming,
  aiPending,
  suggestion,
  variants,
  onAdoptAll,
  onInsert,
  onReplaceSelection,
  onRegenerate,
  onAdjust,
  checklist,
  onToggleCheck,
  onComplete,
  completing,
  onStepOpen,
  openingStepKey,
  prevCtx,
  quotaError,
  actionError,
  usedImageAssets,
  onRemoveAsset,
  removingAssociationId,
  assetPickerOpen,
  onCloseAssetPicker,
  onPickImage,
  onSelectAsset,
  addingImage,
  stepTitle,
  moreMenu,
  dialog,
  selectionRewrite,
}: ProjectWizardViewProps) {
  const totalSteps = pipeline?.steps.length ?? 0
  const showPlatformPicker = canEditPlatforms && stepIndex <= 1
  const sourceParts = [
    '品牌档案',
    prevCtx.title ? `步骤${prevCtx.title}` : null,
    project.primary_platform_key
      ? `主平台 ${platformLabels([project.primary_platform_key])}`
      : platformLabels(project.target_platforms) || null,
  ].filter(Boolean) as string[]

  const stepBadgeLabel = isPublish
    ? (project.publish_progress?.summary_label ?? '发布核对')
    : `步骤 ${stepIndex + 1}/${totalSteps}`

  const editorPanel = (
    <StepEditorPanel
      title={step?.title ?? project.current_step_key}
      decisionHint={step?.description}
      content={content}
      onContentChange={(nextContent) => {
        if (selectionRewrite?.locked) return
        setContent(nextContent)
        setEditorSelection(null)
      }}
      onSelectionChange={(start, end) => {
        if (selectionRewrite?.locked) return
        setEditorSelection(captureSelection(content, start, end))
      }}
      onSaveDraft={onSaveDraft}
      onConfirm={onConfirm}
      savingDraft={savingDraft}
      confirming={confirming}
      draftStatus={draftStatus}
      editorDisabled={aiPending || !!selectionRewrite?.locked}
      onPickImage={onPickImage}
      addingImage={addingImage}
      selectionToolbar={
        selectionRewrite?.showFloat ? (
          <SelectionRewriteFloat
            chips={selectionRewrite.chips}
            loading={selectionRewrite.loading}
            preview={selectionRewrite.preview}
            locked={selectionRewrite.locked}
            onRewrite={selectionRewrite.onRewrite}
            onConfirm={selectionRewrite.onConfirm}
            onCancel={selectionRewrite.onCancel}
          />
        ) : null
      }
    />
  )

  return (
    <div className={`${shared.page} ${styles.page}`}>
      {dialog}
      <div className={styles.toolbar}>
        <Link to="/" className={shared.backLink}>
          ← 返回列表
        </Link>
        {moreMenu}
      </div>

      {draftWarning && (
        <p className={shared.error} role="alert">
          {draftWarning}
        </p>
      )}

      <header className={styles.heroCompact}>
        <div className={styles.heroCompactMain}>
          <p className={styles.meta}>
            {pipelineLabel(project.pipeline_id)}
            {project.target_platforms.length > 0 && (
              <>
                <span className={styles.metaDot}>·</span>
                {platformLabels(project.target_platforms)}
              </>
            )}
          </p>
          <label className={styles.titleEdit}>
            <span className="sr-only">项目标题</span>
            <input
              className={styles.titleInputCompact}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={onSaveTitle}
            />
          </label>
        </div>
        <span className={styles.stepBadge}>{stepBadgeLabel}</span>
      </header>

      {showPlatformPicker && (
        <details className={styles.platformFold}>
          <summary className={styles.platformFoldSummary}>
            <span className={styles.platformFoldLabel}>目标平台</span>
            <span className={styles.platformFoldValue}>
              {platformLabels(editPlatforms.length > 0 ? editPlatforms : project.target_platforms)}
              {editPrimaryPlatform || project.primary_platform_key
                ? ` · 主平台 ${platformLabels([editPrimaryPlatform || project.primary_platform_key!])}`
                : ''}
            </span>
          </summary>
          <div className={styles.metaEdit}>
            <PlatformPicker
              options={CREATOR_PLATFORMS}
              value={editPlatforms}
              onChange={onEditPlatformsChange}
              legend="目标平台（前两步可修改）"
              showPrimary
              primaryKey={editPrimaryPlatform || null}
              onPrimaryChange={onEditPrimaryChange}
            />
          </div>
        </details>
      )}

      {isPublish ? (
        pipeline && (
          <StepProgress
            steps={pipeline.steps}
            currentStepKey={project.current_step_key}
            onStepOpen={onStepOpen}
            openingStepKey={openingStepKey}
          />
        )
      ) : (
        <div className={styles.stickyWizardHead}>
          {pipeline && (
            <StepProgress
              steps={pipeline.steps}
              currentStepKey={project.current_step_key}
              onStepOpen={onStepOpen}
              openingStepKey={openingStepKey}
            />
          )}
          <ContextChips
            brand={brand}
            prevStepTitle={prevCtx.title}
            prevStepSummary={prevCtx.summary}
          />
        </div>
      )}

      {isPublish ? (
        <>
          <PublishChecklist
            items={checklist}
            onToggle={onToggleCheck}
            onComplete={onComplete}
            completing={completing}
          />
          {quotaError && <QuotaLimitNotice kind={quotaError} />}
          {actionError && <p className={shared.error}>{actionError}</p>}
        </>
      ) : (
        <>
          {step?.ai_enabled ? (
            <>
              <StepWorkspace
                editor={editorPanel}
                aiPanel={
                  <AiSuggestionPanel
                    stepTitle={step.title}
                    suggestion={suggestion}
                    variants={variants}
                    loading={aiPending}
                    quotaBlocked={quotaError === 'ai'}
                    sourceParts={sourceParts}
                    adjustments={adjustmentsForStep(project.current_step_key)}
                    onAdoptAll={onAdoptAll}
                    hasActiveSelection={hasActiveSelection(editorSelection, content)}
                    onInsert={onInsert}
                    onReplaceSelection={onReplaceSelection}
                    onRegenerate={onRegenerate}
                    onAdjust={onAdjust}
                  />
                }
              />
              {quotaError === 'projects' && <QuotaLimitNotice kind={quotaError} />}
            </>
          ) : (
            <>
              {editorPanel}
              {quotaError && <QuotaLimitNotice kind={quotaError} />}
            </>
          )}
          {actionError && <p className={shared.error}>{actionError}</p>}
        </>
      )}

      <ImageAssetPreview
        assets={usedImageAssets}
        currentStepKey={project.current_step_key}
        onRemove={onRemoveAsset}
        removingAssociationId={removingAssociationId}
      />
      <StepVersionHistory artifacts={project.artifacts} stepTitle={stepTitle} />
      <ImageAssetPicker
        open={assetPickerOpen}
        onClose={onCloseAssetPicker}
        onSelect={onSelectAsset}
        selecting={addingImage}
      />
    </div>
  )
}

import { Link } from 'react-router-dom'
import { AiSuggestionPanel } from '../../components/AiSuggestionPanel'
import { ContextChips } from '../../components/ContextChips'
import { ImageAssetPicker } from '../../components/ImageAssetPicker'
import { ImageAssetPreview } from '../../components/ImageAssetPreview'
import { PlatformPicker } from '../../components/PlatformPicker'
import { PublishChecklist } from '../../components/PublishChecklist'
import { QuotaLimitNotice } from '../../components/QuotaLimitNotice'
import { SelectionRewriteFloat } from '../../components/SelectionRewriteFloat'
import { StepEditorPanel } from '../../components/StepEditorPanel'
import { StepProgress } from '../../components/StepProgress'
import { StepWorkspace } from '../../components/StepWorkspace'
import { StepVersionHistory } from '../../components/StepVersionHistory'
import type { ProjectWizardModel } from '../../hooks/useProjectWizardModel'
import { CREATOR_PLATFORMS } from '../../lib/platforms'
import { pipelineLabel, platformLabels } from '../../lib/labels'
import { adjustmentsForStep } from '../../lib/stepAiAdjustments'
import {
  captureSelection,
  hasActiveSelection,
} from '../../lib/editorSelection'
import shared from '../../styles/shared.module.css'
import styles from '../ProjectDetailPage.module.css'

interface ProjectWizardViewProps {
  model: ProjectWizardModel
}

export function ProjectWizardView({ model }: ProjectWizardViewProps) {
  const {
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
  } = model

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
      lockReason={
        selectionRewrite?.locked
          ? 'rewrite-preview'
          : aiPending
            ? 'ai-generating'
            : undefined
      }
      onPickImage={onPickImage}
      addingImage={addingImage}
      selectionToolbar={
        selectionRewrite?.showFloat
          ? ({ textareaRef }) => (
              <SelectionRewriteFloat
                chips={selectionRewrite.chips}
                loading={selectionRewrite.loading}
                preview={selectionRewrite.preview}
                locked={selectionRewrite.locked}
                actionsDisabled={aiPending}
                textareaRef={textareaRef}
                selectionStart={editorSelection?.start ?? 0}
                selectionEnd={editorSelection?.end ?? 0}
                onRewrite={selectionRewrite.onRewrite}
                onRegenerate={selectionRewrite.onRegenerate}
                onConfirm={selectionRewrite.onConfirm}
                onCancel={selectionRewrite.onCancel}
              />
            )
          : null
      }
    />
  )

  return (
    <div className={`${shared.page} ${styles.page}`}>
      {dialog}

      {draftWarning && (
        <p className={shared.error} role="alert">
          {draftWarning}
        </p>
      )}

      <header className={styles.heroCompact}>
        <div className={styles.heroChrome}>
          <Link to="/" className={shared.backLink}>
            ← 返回列表
          </Link>
          {moreMenu}
        </div>
        <div className={styles.heroBody}>
          <div className={styles.heroCompactMain}>
            <p className={styles.meta}>
              {pipelineLabel(project.pipeline_id)}
              {!showPlatformPicker && project.target_platforms.length > 0 && (
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
        </div>
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

import { useMutation } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { deleteProject, updateProject } from '../api/creator'
import { LoadingBlock } from '../components/LoadingBlock'
import { useToast } from '../components/Toast'
import { useConfirmDialog } from '../hooks/useConfirmDialog'
import { useProjectDetail } from '../hooks/useProjectDetail'
import { useProjectDraftAutosave } from '../hooks/useProjectDraftAutosave'
import { useProjectMediaAssociations } from '../hooks/useProjectMediaAssociations'
import { useProjectPublish } from '../hooks/useProjectPublish'
import { useProjectStepAi } from '../hooks/useProjectStepAi'
import { useSelectionRewrite } from '../hooks/useSelectionRewrite'
import {
  applySelectionInsertion,
  hasActiveSelection,
  type TextSelection,
} from '../lib/editorSelection'
import { ProjectCompletedView } from './project-detail/ProjectCompletedView'
import { ProjectWizardView } from './project-detail/ProjectWizardView'
import styles from './ProjectDetailPage.module.css'

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { confirm, dialog } = useConfirmDialog()
  const { showToast } = useToast()
  const draftWarning =
    (location.state as { draftWarning?: string } | null)?.draftWarning ?? null

  const detail = useProjectDetail(id)
  const {
    project,
    isLoading,
    brand,
    pipeline,
    step,
    stepIndex,
    isPublish,
    canEditPlatforms,
    quotaError,
    setQuotaError,
    actionError,
    setActionError,
    handleApiError,
    applyProjectUpdate,
    stepTitle,
    prevStepContext,
    queryClient,
  } = detail

  const [content, setContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editPlatforms, setEditPlatforms] = useState<string[]>([])
  const [editPrimaryPlatform, setEditPrimaryPlatform] = useState('')
  const [editorSelection, setEditorSelection] = useState<TextSelection | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const moreMenuId = useId()
  const autosaveBlockedRef = useRef(false)

  useEffect(() => {
    if (project) {
      setEditTitle(project.title)
      setEditPlatforms(project.target_platforms)
      setEditPrimaryPlatform(project.primary_platform_key ?? '')
    }
    // Intentionally keyed by fields that should reset local edit buffers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    project?.id,
    project?.title,
    project?.target_platforms,
    project?.primary_platform_key,
  ])

  useEffect(() => {
    if (project) setEditorSelection(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, project?.current_step_key])

  const draft = useProjectDraftAutosave({
    projectId: id,
    project,
    isPublish: !!isPublish,
    content,
    setContent,
    blockedRef: autosaveBlockedRef,
    applyProjectUpdate,
    handleApiError,
    setActionError,
    showToast,
  })

  const stepAi = useProjectStepAi({
    projectId: id,
    project,
    step,
    stepIndex,
    isPublish: !!isPublish,
    content,
    setContent,
    applyProjectUpdate,
    handleApiError,
    setQuotaError,
    setActionError,
    setDraftSaveError: draft.setDraftSaveError,
    setDraftSavedFlash: draft.setDraftSavedFlash,
    markAutosaveSkip: draft.markAutosaveSkip,
    showToast,
    queryClient,
  })

  const selectionRewrite = useSelectionRewrite({
    projectId: id,
    stepKey: step?.key,
    aiEnabled: !!step?.ai_enabled,
    isPublish: !!isPublish,
    content,
    selection: editorSelection,
    setContent,
    setSelection: setEditorSelection,
    handleApiError,
    setQuotaError,
    setActionError,
    flushDraft: async () => {
      if (!id || !project || isPublish || project.status === 'completed') return
      const serverDraft = project.draft_content[project.current_step_key] ?? ''
      if (content === serverDraft) return
      await draft.draftMut.mutateAsync({ text: content, toast: false })
    },
    aiPending: stepAi.aiMut.isPending,
    quotaBlocked: quotaError === 'ai',
  })

  useEffect(() => {
    autosaveBlockedRef.current =
      stepAi.confirmMut.isPending ||
      stepAi.aiMut.isPending ||
      selectionRewrite.loading ||
      selectionRewrite.locked
  }, [
    stepAi.aiMut.isPending,
    stepAi.confirmMut.isPending,
    selectionRewrite.loading,
    selectionRewrite.locked,
  ])

  const media = useProjectMediaAssociations({
    projectId: id,
    projectStepKey: project?.current_step_key,
    content,
    setContent,
    editorSelection,
    setEditorSelection,
    handleApiError,
    setActionError,
    queryClient,
  })

  const publish = useProjectPublish({
    projectId: id,
    isPublish: !!isPublish,
    applyProjectUpdate,
    handleApiError,
    setQuotaError,
    setActionError,
    markAutosaveSkip: draft.markAutosaveSkip,
    setContent,
    queryClient,
  })

  const updateMut = useMutation({
    mutationFn: (payload: {
      title?: string
      target_platform_keys?: string[]
      primary_platform_key?: string | null
    }) => updateProject(id!, payload),
    onSuccess: (updated) => {
      setActionError(null)
      applyProjectUpdate(updated, {
        onSyncContent: (next) => {
          if (selectionRewrite.locked) return
          draft.markAutosaveSkip()
          setContent(next)
        },
      })
      setEditTitle(updated.title)
      setEditPlatforms(updated.target_platforms)
      setEditPrimaryPlatform(updated.primary_platform_key ?? '')
      if (canEditPlatforms) {
        void queryClient.invalidateQueries({ queryKey: ['checklist', id] })
      }
    },
    onError: handleApiError,
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteProject(id!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
      navigate('/')
    },
    onError: handleApiError,
  })

  useEffect(() => {
    if (!moreOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [moreOpen])

  if (isLoading || !project) {
    return (
      <div className={styles.loadingWrap}>
        <LoadingBlock />
      </div>
    )
  }

  async function handleDelete() {
    setMoreOpen(false)
    const ok = await confirm({
      title: '删除项目',
      message: '确定删除此项目？此操作不可恢复。',
      confirmLabel: '删除项目',
      cancelLabel: '取消',
      variant: 'danger',
    })
    if (!ok) return
    deleteMut.mutate()
  }

  function saveTitle() {
    const trimmed = editTitle.trim()
    if (!trimmed || trimmed === project!.title) return
    updateMut.mutate({ title: trimmed })
  }

  function commitPlatformEdit(next: string[], primary: string) {
    void savePlatforms(next, primary)
  }

  function handleEditPlatformsChange(next: string[]) {
    if (selectionRewrite.locked) return
    setEditPlatforms(next)
    let primary = editPrimaryPlatform
    if (next.length === 1) {
      primary = next[0]!
      setEditPrimaryPlatform(primary)
    } else if (primary && !next.includes(primary)) {
      primary = ''
      setEditPrimaryPlatform('')
    }
    commitPlatformEdit(next, primary)
  }

  function handleEditPrimaryChange(key: string) {
    if (selectionRewrite.locked) return
    setEditPrimaryPlatform(key)
    commitPlatformEdit(editPlatforms, key)
  }

  async function savePlatforms(next: string[], primary: string) {
    setEditPlatforms(next)
    if (next.length === 0) return
    if (next.length > 1 && !primary) {
      setActionError('请选择主平台')
      return
    }
    const changed =
      next.length !== project!.target_platforms.length ||
      next.some((key) => !project!.target_platforms.includes(key)) ||
      primary !== (project!.primary_platform_key ?? '')
    if (changed) {
      const ok = await confirm({
        title: '修改目标平台',
        message: '修改目标平台将清空发布核对进度，确定继续？',
        confirmLabel: '继续修改',
        cancelLabel: '取消',
        variant: 'danger',
      })
      if (!ok) {
        setEditPlatforms(project!.target_platforms)
        setEditPrimaryPlatform(project!.primary_platform_key ?? '')
        return
      }
    }
    updateMut.mutate({
      target_platform_keys: next,
      primary_platform_key: next.length === 1 ? next[0] : primary,
    })
  }

  function applyAiText(text: string, mode: 'insert' | 'replace') {
    if (selectionRewrite.locked) return
    if (!hasActiveSelection(editorSelection, content) || editorSelection === null) {
      setContent((current) => (current ? `${current}\n\n${text}` : text))
      setEditorSelection(null)
      return
    }
    const insertion = mode === 'insert' ? `${text}\n\n` : text
    const result = applySelectionInsertion(content, editorSelection, insertion)
    setContent(result.content)
    setEditorSelection(result.selection)
  }

  const moreMenu = (
    <div className={styles.moreMenu} ref={moreRef}>
      <button
        type="button"
        className={styles.moreTrigger}
        aria-expanded={moreOpen}
        aria-controls={moreMenuId}
        aria-haspopup="menu"
        onClick={() => setMoreOpen((v) => !v)}
        aria-label="更多操作"
      >
        ⋯
      </button>
      {moreOpen && (
        <div id={moreMenuId} className={styles.morePopover} role="menu">
          <button
            type="button"
            role="menuitem"
            className={styles.moreDanger}
            onClick={() => void handleDelete()}
            disabled={deleteMut.isPending}
          >
            删除项目
          </button>
        </div>
      )}
    </div>
  )

  if (project.status === 'completed') {
    return (
      <ProjectCompletedView
        project={project}
        editTitle={editTitle}
        setEditTitle={setEditTitle}
        onSaveTitle={saveTitle}
        usedImageAssets={media.usedImageAssets}
        onRemoveAsset={(item) => media.disassociateMediaMut.mutate(item)}
        removingAssociationId={
          media.disassociateMediaMut.isPending
            ? media.disassociateMediaMut.variables.association.id
            : null
        }
        stepTitle={stepTitle}
        actionError={actionError}
        moreMenu={moreMenu}
        dialog={dialog}
      />
    )
  }

  return (
    <ProjectWizardView
      project={project}
      pipeline={pipeline}
      step={step}
      stepIndex={stepIndex}
      brand={brand}
      isPublish={!!isPublish}
      canEditPlatforms={!!canEditPlatforms}
      draftWarning={draftWarning}
      editTitle={editTitle}
      setEditTitle={setEditTitle}
      onSaveTitle={saveTitle}
      editPlatforms={editPlatforms}
      editPrimaryPlatform={editPrimaryPlatform}
      onEditPlatformsChange={handleEditPlatformsChange}
      onEditPrimaryChange={handleEditPrimaryChange}
      content={content}
      setContent={setContent}
      editorSelection={editorSelection}
      setEditorSelection={setEditorSelection}
      draftStatus={draft.draftStatus}
      onSaveDraft={() => draft.draftMut.mutate({ text: content, toast: true })}
      onConfirm={() => stepAi.confirmMut.mutate()}
      savingDraft={draft.draftMut.isPending}
      confirming={stepAi.confirmMut.isPending}
      aiPending={stepAi.aiMut.isPending}
      suggestion={stepAi.suggestion}
      variants={stepAi.variants}
      onAdoptAll={(text) => {
        if (selectionRewrite.locked) return
        setContent(text)
      }}
      onInsert={(text) => applyAiText(text, 'insert')}
      onReplaceSelection={(text) => applyAiText(text, 'replace')}
      onRegenerate={() => {
        if (selectionRewrite.locked) return
        stepAi.aiMut.mutate(undefined)
      }}
      onAdjust={(adj) => {
        if (selectionRewrite.locked) return
        stepAi.aiMut.mutate(adj)
      }}
      checklist={publish.checklist}
      onToggleCheck={publish.toggleCheck}
      onComplete={() => publish.completeMut.mutate()}
      completing={publish.completeMut.isPending}
      onStepOpen={(stepKey) => {
        if (selectionRewrite.locked) return
        stepAi.openMut.mutate(stepKey)
      }}
      openingStepKey={stepAi.openMut.isPending ? stepAi.openMut.variables : null}
      prevCtx={prevStepContext()}
      quotaError={quotaError}
      actionError={actionError}
      usedImageAssets={media.usedImageAssets}
      onRemoveAsset={(item) => media.disassociateMediaMut.mutate(item)}
      removingAssociationId={
        media.disassociateMediaMut.isPending
          ? media.disassociateMediaMut.variables.association.id
          : null
      }
      assetPickerOpen={media.assetPickerOpen}
      onCloseAssetPicker={() => media.setAssetPickerOpen(false)}
      onPickImage={() => media.setAssetPickerOpen(true)}
      onSelectAsset={(asset) => media.associateMediaMut.mutate(asset)}
      addingImage={media.associateMediaMut.isPending}
      stepTitle={stepTitle}
      moreMenu={moreMenu}
      dialog={dialog}
      selectionRewrite={selectionRewrite}
    />
  )
}

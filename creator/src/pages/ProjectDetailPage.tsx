import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { creatorApiErrorMessage } from '../lib/errors'
import {
  aiSuggest,
  completeProject,
  confirmStep,
  deleteProject,
  fetchBrand,
  fetchPipelines,
  fetchProject,
  fetchPublishChecklist,
  openStep,
  saveDraft,
  updateProject,
  updatePublishChecklist,
} from '../api/creator'
import { AiSuggestionPanel } from '../components/AiSuggestionPanel'
import { CompletedBanner } from '../components/CompletedBanner'
import { ContextChips } from '../components/ContextChips'
import { LoadingBlock } from '../components/LoadingBlock'
import { PlatformPicker } from '../components/PlatformPicker'
import { PublishChecklist } from '../components/PublishChecklist'
import { QuotaLimitNotice, quotaLimitKindFromCode } from '../components/QuotaLimitNotice'
import { StepEditorPanel } from '../components/StepEditorPanel'
import { StepProgress } from '../components/StepProgress'
import { StepWorkspace } from '../components/StepWorkspace'
import { StepVersionHistory } from '../components/StepVersionHistory'
import { adjustmentsForStep, shouldAutoSuggest } from '../lib/stepAiAdjustments'
import { pipelineLabel, platformLabels } from '../lib/labels'
import type { Project, PublishChecklistItem } from '../types/api'
import shared from '../styles/shared.module.css'
import styles from './ProjectDetailPage.module.css'

const PLATFORMS = [
  { key: 'douyin', label: '抖音', emoji: '🎵' },
  { key: 'xiaohongshu', label: '小红书', emoji: '📕' },
  { key: 'wechat', label: '公众号', emoji: '💬' },
  { key: 'bilibili', label: 'B站', emoji: '📺' },
]

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id!),
    enabled: !!id,
  })
  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines'],
    queryFn: fetchPipelines,
  })
  const { data: brand = { tone: '', audience: '', taboos: '', structure_notes: '' } } = useQuery({
    queryKey: ['brand'],
    queryFn: fetchBrand,
  })
  const isPublish = project?.current_step_key === 'publish'
  const canEditPlatforms = project?.status !== 'completed' && !isPublish
  const { data: checklist = [] } = useQuery({
    queryKey: ['checklist', id],
    queryFn: () => fetchPublishChecklist(id!),
    enabled: !!id && isPublish,
  })

  const [content, setContent] = useState('')
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editPlatforms, setEditPlatforms] = useState<string[]>([])
  const [quotaError, setQuotaError] = useState<'ai' | 'projects' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const pipeline = pipelines.find((p) => p.id === project?.pipeline_id)
  const step = pipeline?.steps.find((s) => s.key === project?.current_step_key)
  const stepIndex = pipeline?.steps.findIndex((s) => s.key === project?.current_step_key) ?? 0

  useEffect(() => {
    if (project) {
      setContent(project.draft_content[project.current_step_key] ?? '')
      setEditTitle(project.title)
      setEditPlatforms(project.target_platforms)
    }
  }, [project?.id, project?.current_step_key, project?.draft_content, project?.title, project?.target_platforms])

  function stepTitle(key: string) {
    return pipeline?.steps.find((s) => s.key === key)?.title ?? key
  }

  function prevStepContext() {
    if (!pipeline || !project || stepIndex <= 0) return { title: undefined, summary: undefined }
    const prev = pipeline.steps[stepIndex - 1]
    const art = [...project.artifacts]
      .filter((a) => a.step_key === prev.key)
      .sort((a, b) => b.version - a.version)[0]
    return { title: prev.title, summary: art?.content }
  }

  function applyProjectUpdate(updated: Project) {
    queryClient.setQueryData(['project', id], updated)
    setContent(updated.draft_content[updated.current_step_key] ?? '')
    setEditTitle(updated.title)
    setEditPlatforms(updated.target_platforms)
    void queryClient.invalidateQueries({ queryKey: ['projects'] })
    void queryClient.invalidateQueries({ queryKey: ['usage'] })
  }

  function handleApiError(err: unknown) {
    if (err instanceof ApiError) {
      const kind = quotaLimitKindFromCode(err.code)
      if (kind) {
        setQuotaError(kind)
        setActionError(null)
        return
      }
      setActionError(creatorApiErrorMessage(err.code, err.message))
      return
    }
    setActionError(err instanceof Error ? err.message : '操作失败')
  }

  const draftMut = useMutation({
    mutationFn: () => saveDraft(id!, project!.current_step_key, content),
    onSuccess: (updated) => {
      setActionError(null)
      applyProjectUpdate(updated)
    },
    onError: handleApiError,
  })

  const confirmMut = useMutation({
    mutationFn: () => confirmStep(id!, project!.current_step_key, content),
    onSuccess: (updated) => {
      setQuotaError(null)
      setActionError(null)
      applyProjectUpdate(updated)
    },
    onError: handleApiError,
  })

  const aiMut = useMutation({
    mutationFn: (adjustment?: string) => aiSuggest(id!, project!.current_step_key, adjustment),
    onSuccess: (data) => {
      setQuotaError(null)
      setActionError(null)
      setSuggestion(data.suggestion)
      void queryClient.invalidateQueries({ queryKey: ['usage'] })
    },
    onError: handleApiError,
  })

  useEffect(() => {
    if (!project || !step || isPublish) return
    setSuggestion(null)
    const draft = project.draft_content[project.current_step_key] ?? ''
    if (shouldAutoSuggest(stepIndex, step.ai_enabled, !draft.trim())) {
      aiMut.mutate(undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on step change
  }, [project?.current_step_key])

  const completeMut = useMutation({
    mutationFn: () => completeProject(id!),
    onSuccess: (updated) => {
      setQuotaError(null)
      setActionError(null)
      applyProjectUpdate(updated)
    },
    onError: handleApiError,
  })

  const checklistMut = useMutation({
    mutationFn: (keys: string[]) => updatePublishChecklist(id!, keys),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['checklist', id] })
      void queryClient.invalidateQueries({ queryKey: ['project', id] })
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  const openMut = useMutation({
    mutationFn: (stepKey: string) => openStep(id!, stepKey),
    onSuccess: (updated) => {
      setActionError(null)
      applyProjectUpdate(updated)
    },
    onError: handleApiError,
  })

  const updateMut = useMutation({
    mutationFn: (payload: { title?: string; target_platform_keys?: string[] }) =>
      updateProject(id!, payload),
    onSuccess: (updated) => {
      setActionError(null)
      applyProjectUpdate(updated)
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

  if (isLoading || !project) {
    return (
      <div className={styles.loadingWrap}>
        <LoadingBlock />
      </div>
    )
  }

  function handleDelete() {
    if (!window.confirm('确定删除此项目？此操作不可恢复。')) return
    deleteMut.mutate()
  }

  function saveTitle() {
    const trimmed = editTitle.trim()
    if (!trimmed || trimmed === project!.title) return
    updateMut.mutate({ title: trimmed })
  }

  function savePlatforms(next: string[]) {
    setEditPlatforms(next)
    if (next.length === 0) return
    const changed =
      next.length !== project!.target_platforms.length ||
      next.some((key) => !project!.target_platforms.includes(key))
    if (
      changed &&
      !window.confirm('修改目标平台将清空发布核对进度，确定继续？')
    ) {
      setEditPlatforms(project!.target_platforms)
      return
    }
    updateMut.mutate({ target_platform_keys: next })
  }

  if (project.status === 'completed') {
    return (
      <div className={`${shared.page} ${styles.page}`}>
        <div className={styles.toolbar}>
          <Link to="/" className={shared.backLink}>
            ← 返回列表
          </Link>
          <button
            type="button"
            className={shared.btnGhost}
            onClick={handleDelete}
            disabled={deleteMut.isPending}
          >
            删除项目
          </button>
        </div>
        <CompletedBanner title={project.title} />
        <section className={styles.metaEdit}>
          <label className={shared.fieldLabel}>
            项目标题
            <input
              className={shared.input}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={saveTitle}
            />
          </label>
        </section>
        <StepVersionHistory artifacts={project.artifacts} stepTitle={stepTitle} />
        {actionError && <p className={shared.error}>{actionError}</p>}
      </div>
    )
  }

  function checklistKey(item: PublishChecklistItem) {
    return `${item.platform}:${item.item_key}`
  }

  function toggleCheck(item: PublishChecklistItem) {
    const key = checklistKey(item)
    const current = checklist.filter((c) => c.checked).map(checklistKey)
    const next = item.checked ? current.filter((k) => k !== key) : [...current, key]
    checklistMut.mutate(next)
  }

  const prevCtx = prevStepContext()
  const sourceParts = [
    '品牌档案',
    prevCtx.title ? `步骤${prevCtx.title}` : null,
    platformLabels(project.target_platforms) || null,
  ].filter(Boolean) as string[]

  const totalSteps = pipeline?.steps.length ?? 0
  const showPlatformPicker = canEditPlatforms && stepIndex <= 1

  const editorPanel = (
    <StepEditorPanel
      title={step?.title ?? project.current_step_key}
      decisionHint={step?.description}
      content={content}
      onContentChange={setContent}
      onSaveDraft={() => draftMut.mutate()}
      onConfirm={() => confirmMut.mutate()}
      savingDraft={draftMut.isPending}
      confirming={confirmMut.isPending}
      editorDisabled={aiMut.isPending}
    />
  )

  const stepBadgeLabel = isPublish
    ? (project.publish_progress?.summary_label ?? '发布核对')
    : `步骤 ${stepIndex + 1}/${totalSteps}`

  return (
    <div className={`${shared.page} ${styles.page}`}>
      <div className={styles.toolbar}>
        <Link to="/" className={shared.backLink}>
          ← 返回列表
        </Link>
        <button
          type="button"
          className={shared.btnGhost}
          onClick={handleDelete}
          disabled={deleteMut.isPending}
        >
          删除项目
        </button>
      </div>

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
              onBlur={saveTitle}
            />
          </label>
        </div>
        <span className={styles.stepBadge}>{stepBadgeLabel}</span>
      </header>

      {showPlatformPicker && (
        <section className={styles.metaEdit}>
          <PlatformPicker
            options={PLATFORMS}
            value={editPlatforms}
            onChange={savePlatforms}
            legend="目标平台（前两步可修改）"
          />
        </section>
      )}

      {isPublish ? (
        pipeline && (
          <StepProgress
            steps={pipeline.steps}
            currentStepKey={project.current_step_key}
            onStepOpen={(stepKey) => openMut.mutate(stepKey)}
            openingStepKey={openMut.isPending ? openMut.variables : null}
          />
        )
      ) : (
        <div className={styles.stickyWizardHead}>
          {pipeline && (
            <StepProgress
              steps={pipeline.steps}
              currentStepKey={project.current_step_key}
              onStepOpen={(stepKey) => openMut.mutate(stepKey)}
              openingStepKey={openMut.isPending ? openMut.variables : null}
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
            onToggle={toggleCheck}
            onComplete={() => completeMut.mutate()}
            completing={completeMut.isPending}
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
                    loading={aiMut.isPending}
                    quotaBlocked={quotaError === 'ai'}
                    sourceParts={sourceParts}
                    adjustments={adjustmentsForStep(project.current_step_key)}
                    onAdoptAll={() => setContent(suggestion ?? '')}
                    onInsert={() =>
                      setContent((c) => (c ? `${c}\n\n${suggestion}` : (suggestion ?? '')))
                    }
                    onRegenerate={() => aiMut.mutate(undefined)}
                    onAdjust={(adj) => aiMut.mutate(adj)}
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

      <StepVersionHistory artifacts={project.artifacts} stepTitle={stepTitle} />
    </div>
  )
}

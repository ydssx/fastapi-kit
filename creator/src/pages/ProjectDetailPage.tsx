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
  fetchPipelines,
  fetchProject,
  fetchPublishChecklist,
  openStep,
  saveDraft,
  updateProject,
  updatePublishChecklist,
} from '../api/creator'
import { AiLoadingOverlay } from '../components/AiLoadingOverlay'
import { CompletedBanner } from '../components/CompletedBanner'
import { LoadingBlock } from '../components/LoadingBlock'
import { PipelineThumbnail } from '../components/PipelineThumbnail'
import { PlatformPicker } from '../components/PlatformPicker'
import { PublishChecklist } from '../components/PublishChecklist'
import { QuotaLimitNotice, quotaLimitKindFromCode } from '../components/QuotaLimitNotice'
import { StepEditorPanel } from '../components/StepEditorPanel'
import { StepProgress } from '../components/StepProgress'
import { StepVersionHistory } from '../components/StepVersionHistory'
import { useAuth } from '../auth/AuthContext'
import { formatProjectDate } from '../lib/format'
import { pipelineLabel, platformLabels, statusLabel } from '../lib/labels'
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
  const { user } = useAuth()
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
  const isPublish = project?.current_step_key === 'publish'
  const canEditPlatforms = project?.status !== 'completed' && !isPublish
  const { data: checklist = [] } = useQuery({
    queryKey: ['checklist', id],
    queryFn: () => fetchPublishChecklist(id!),
    enabled: !!id && isPublish,
  })

  const [content, setContent] = useState('')
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
    mutationFn: () => aiSuggest(id!, project!.current_step_key),
    onSuccess: (data) => {
      setQuotaError(null)
      setActionError(null)
      setContent(data.suggestion)
      void queryClient.invalidateQueries({ queryKey: ['usage'] })
    },
    onError: handleApiError,
  })

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

      <header className={styles.hero}>
        <PipelineThumbnail pipelineId={project.pipeline_id} className={styles.heroThumb} />
        <div className={styles.heroBody}>
          <div className={styles.heroTop}>
            <p className={styles.meta}>
              {pipelineLabel(project.pipeline_id)}
              {project.target_platforms.length > 0 && (
                <>
                  <span className={styles.metaDot}>·</span>
                  {platformLabels(project.target_platforms)}
                </>
              )}
            </p>
            <span className={shared.badgeProgress}>
              {isPublish && project.publish_progress
                ? project.publish_progress.summary_label
                : statusLabel(project.status)}
            </span>
          </div>
          <label className={styles.titleEdit}>
            <span className="sr-only">项目标题</span>
            <input
              className={styles.titleInput}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={saveTitle}
            />
          </label>
          {step?.description && <p className={styles.heroDesc}>{step.description}</p>}
          <dl className={styles.heroStats}>
            <div>
              <dt>创建</dt>
              <dd>{formatProjectDate(project.created_at)}</dd>
            </div>
            <div>
              <dt>更新</dt>
              <dd>{formatProjectDate(project.updated_at)}</dd>
            </div>
            {user?.email && (
              <div>
                <dt>创作者</dt>
                <dd>{user.email}</dd>
              </div>
            )}
          </dl>
          <p className={styles.stepHint}>
            {isPublish
              ? project.publish_progress?.summary_label ?? '发布核对'
              : `步骤 ${stepIndex + 1}/${pipeline?.steps.length ?? 0} · ${step?.title ?? project.current_step_key}`}
          </p>
        </div>
      </header>

      {canEditPlatforms && (
        <section className={styles.metaEdit}>
          <PlatformPicker
            options={PLATFORMS}
            value={editPlatforms}
            onChange={savePlatforms}
            legend="目标平台（发布步骤前可修改）"
          />
        </section>
      )}

      {pipeline && (
        <StepProgress
          steps={pipeline.steps}
          currentStepKey={project.current_step_key}
          onStepOpen={(stepKey) => openMut.mutate(stepKey)}
          openingStepKey={openMut.isPending ? openMut.variables : null}
        />
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
          <StepEditorPanel
            title={step?.title ?? project.current_step_key}
            content={content}
            onContentChange={setContent}
            aiEnabled={step?.ai_enabled ?? false}
            onSaveDraft={() => draftMut.mutate()}
            onAiSuggest={() => aiMut.mutate()}
            onConfirm={() => confirmMut.mutate()}
            savingDraft={draftMut.isPending}
            aiPending={aiMut.isPending}
            confirming={confirmMut.isPending}
          />
          {quotaError && <QuotaLimitNotice kind={quotaError} />}
          {actionError && <p className={shared.error}>{actionError}</p>}
        </>
      )}

      <AiLoadingOverlay active={aiMut.isPending} />

      <StepVersionHistory artifacts={project.artifacts} stepTitle={stepTitle} />
    </div>
  )
}

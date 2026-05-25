import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  aiSuggest,
  completeProject,
  confirmStep,
  fetchPipelines,
  fetchProject,
  fetchPublishChecklist,
  saveDraft,
  updatePublishChecklist,
} from '../api/creator'
import { StepProgress } from '../components/StepProgress'
import { pipelineLabel, statusLabel } from '../lib/labels'
import type { Project } from '../types/api'
import shared from '../styles/shared.module.css'
import styles from './ProjectDetailPage.module.css'

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
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
  const { data: checklist = [] } = useQuery({
    queryKey: ['checklist', id],
    queryFn: () => fetchPublishChecklist(id!),
    enabled: !!id && isPublish,
  })

  const [content, setContent] = useState('')
  const pipeline = pipelines.find((p) => p.id === project?.pipeline_id)
  const step = pipeline?.steps.find((s) => s.key === project?.current_step_key)
  const stepIndex = pipeline?.steps.findIndex((s) => s.key === project?.current_step_key) ?? 0

  useEffect(() => {
    if (project) {
      setContent(project.draft_content[project.current_step_key] ?? '')
    }
  }, [project?.id, project?.current_step_key, project?.draft_content])

  function applyProjectUpdate(updated: Project) {
    queryClient.setQueryData(['project', id], updated)
    setContent(updated.draft_content[updated.current_step_key] ?? '')
    void queryClient.invalidateQueries({ queryKey: ['projects'] })
    void queryClient.invalidateQueries({ queryKey: ['usage'] })
  }

  const draftMut = useMutation({
    mutationFn: () => saveDraft(id!, project!.current_step_key, content),
    onSuccess: (updated) => applyProjectUpdate(updated),
  })

  const confirmMut = useMutation({
    mutationFn: () => confirmStep(id!, project!.current_step_key, content),
    onSuccess: (updated) => applyProjectUpdate(updated),
  })

  const aiMut = useMutation({
    mutationFn: () => aiSuggest(id!, project!.current_step_key),
    onSuccess: (data) => {
      setContent(data.suggestion)
      void queryClient.invalidateQueries({ queryKey: ['usage'] })
    },
  })

  const completeMut = useMutation({
    mutationFn: () => completeProject(id!),
    onSuccess: (updated) => applyProjectUpdate(updated),
  })

  const checklistMut = useMutation({
    mutationFn: (keys: string[]) => updatePublishChecklist(id!, keys),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['checklist', id] })
    },
  })

  if (isLoading || !project) {
    return <p className={styles.loading}>加载中…</p>
  }

  if (project.status === 'completed') {
    return (
      <div className={`${styles.page} animateIn`}>
        <Link to="/" className={shared.backLink}>
          ← 返回列表
        </Link>
        <div className={styles.completedBanner}>
          <span className={styles.completedIcon} aria-hidden>
            ✓
          </span>
          <div>
            <h1 className={shared.pageTitle}>{project.title}</h1>
            <p className={styles.done}>流水线已完成，内容已归档。</p>
          </div>
        </div>
        {project.artifacts.length > 0 && (
          <section className={styles.history}>
            <h2 className={shared.panelTitle}>已确认步骤</h2>
            <ul className={styles.historyList}>
              {project.artifacts.map((a) => {
                const stepTitle =
                  pipeline?.steps.find((s) => s.key === a.step_key)?.title ?? a.step_key
                return (
                  <li key={`${a.step_key}-${a.version}`} className={styles.historyItem}>
                    <div className={styles.historyHead}>
                      <strong>{stepTitle}</strong>
                      <span>v{a.version}</span>
                    </div>
                    <p>
                      {a.content.slice(0, 200)}
                      {a.content.length > 200 ? '…' : ''}
                    </p>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </div>
    )
  }

  function checklistKey(item: { platform: string; item_key: string }) {
    return `${item.platform}:${item.item_key}`
  }

  function toggleCheck(item: { platform: string; item_key: string; checked: boolean }) {
    const key = checklistKey(item)
    const current = checklist.filter((c) => c.checked).map(checklistKey)
    const next = item.checked ? current.filter((k) => k !== key) : [...current, key]
    checklistMut.mutate(next)
  }

  return (
    <div className={`${styles.page} animateIn`}>
      <Link to="/" className={shared.backLink}>
        ← 返回列表
      </Link>

      <header className={styles.hero}>
        <div>
          <p className={styles.meta}>
            {pipelineLabel(project.pipeline_id)}
            <span className={styles.metaDot}>·</span>
            {statusLabel(project.status)}
          </p>
          <h1 className={shared.pageTitle}>{project.title}</h1>
          <p className={styles.stepHint}>
            步骤 {stepIndex + 1}/{pipeline?.steps.length ?? 0} · {step?.title ?? project.current_step_key}
          </p>
        </div>
      </header>

      {pipeline && <StepProgress steps={pipeline.steps} currentStepKey={project.current_step_key} />}

      {isPublish ? (
        <section className={shared.panel}>
          <h2 className={shared.panelTitle}>发布核对</h2>
          <p className={styles.hint}>勾选各平台发布项，全部完成后可结束项目。</p>
          <ul className={styles.checklist}>
            {checklist.map((item) => (
              <li key={checklistKey(item)}>
                <label className={styles.checkItem}>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleCheck(item)}
                  />
                  <span>
                    <strong>{item.platform_label}</strong>
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className={shared.btnRow}>
            <button
              type="button"
              className={shared.btnPrimary}
              disabled={completeMut.isPending}
              onClick={() => completeMut.mutate()}
            >
              {completeMut.isPending ? '提交中…' : '完成项目'}
            </button>
          </div>
          {completeMut.isError && (
            <p className={shared.error}>{(completeMut.error as Error).message}</p>
          )}
        </section>
      ) : (
        <section className={shared.panel}>
          <h2 className={shared.panelTitle}>{step?.title}</h2>
          <p className={styles.hint}>{step?.description}</p>
          <textarea
            className={shared.textarea}
            rows={12}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`撰写「${step?.title}」…`}
          />
          <div className={shared.btnRow}>
            <button
              type="button"
              className={shared.btnGhost}
              onClick={() => draftMut.mutate()}
              disabled={draftMut.isPending}
            >
              {draftMut.isPending ? '保存中…' : '暂存草稿'}
            </button>
            {step?.ai_enabled && (
              <button
                type="button"
                className={shared.btn}
                onClick={() => aiMut.mutate()}
                disabled={aiMut.isPending}
              >
                {aiMut.isPending ? 'AI 生成中…' : 'AI 建议'}
              </button>
            )}
            <button
              type="button"
              className={shared.btnPrimary}
              onClick={() => confirmMut.mutate()}
              disabled={confirmMut.isPending || !content.trim()}
            >
              {confirmMut.isPending ? '确认中…' : '确认并下一步 →'}
            </button>
          </div>
          {(confirmMut.isError || aiMut.isError) && (
            <p className={shared.error}>
              {((confirmMut.error || aiMut.error) as Error).message}
            </p>
          )}
        </section>
      )}

      {project.artifacts.length > 0 && (
        <section className={styles.history}>
          <h2 className={shared.panelTitle}>已确认步骤</h2>
          <ul className={styles.historyList}>
            {project.artifacts.map((a) => {
              const stepTitle =
                pipeline?.steps.find((s) => s.key === a.step_key)?.title ?? a.step_key
              return (
                <li key={`${a.step_key}-${a.version}`} className={styles.historyItem}>
                  <div className={styles.historyHead}>
                    <strong>{stepTitle}</strong>
                    <span>v{a.version}</span>
                  </div>
                  <p>
                    {a.content.slice(0, 200)}
                    {a.content.length > 200 ? '…' : ''}
                  </p>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

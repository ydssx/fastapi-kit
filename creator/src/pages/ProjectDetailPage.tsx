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

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['project', id] })
    void queryClient.invalidateQueries({ queryKey: ['projects'] })
    void queryClient.invalidateQueries({ queryKey: ['usage'] })
  }

  const draftMut = useMutation({
    mutationFn: () => saveDraft(id!, project!.current_step_key, content),
    onSuccess: invalidate,
  })

  const confirmMut = useMutation({
    mutationFn: () => confirmStep(id!, project!.current_step_key, content),
    onSuccess: invalidate,
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
    onSuccess: invalidate,
  })

  const checklistMut = useMutation({
    mutationFn: (keys: string[]) => updatePublishChecklist(id!, keys),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['checklist', id] })
    },
  })

  if (isLoading || !project) {
    return <p>加载中…</p>
  }

  if (project.status === 'completed') {
    return (
      <div className={styles.page}>
        <Link to="/">← 返回列表</Link>
        <h1>{project.title}</h1>
        <p className={styles.done}>已完成 🎉</p>
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
    <div className={styles.page}>
      <Link to="/">← 返回列表</Link>
      <h1>{project.title}</h1>
      <p className={styles.progress}>
        步骤 {stepIndex + 1}/{pipeline?.steps.length ?? 0} · {step?.title ?? project.current_step_key}
      </p>

      {isPublish ? (
        <section className={styles.panel}>
          <h2>发布核对</h2>
          <ul className={styles.checklist}>
            {checklist.map((item) => (
              <li key={checklistKey(item)}>
                <label>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleCheck(item)}
                  />
                  <span>
                    [{item.platform_label}] {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={styles.primary}
            disabled={completeMut.isPending}
            onClick={() => completeMut.mutate()}
          >
            完成项目
          </button>
          {completeMut.isError && (
            <p className={styles.error}>{(completeMut.error as Error).message}</p>
          )}
        </section>
      ) : (
        <section className={styles.panel}>
          <p className={styles.hint}>{step?.description}</p>
          <textarea
            rows={12}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`撰写「${step?.title}」…`}
          />
          <div className={styles.actions}>
            <button type="button" onClick={() => draftMut.mutate()} disabled={draftMut.isPending}>
              暂存草稿
            </button>
            {step?.ai_enabled && (
              <button type="button" onClick={() => aiMut.mutate()} disabled={aiMut.isPending}>
                {aiMut.isPending ? 'AI 生成中…' : 'AI 建议'}
              </button>
            )}
            <button
              type="button"
              className={styles.primary}
              onClick={() => confirmMut.mutate()}
              disabled={confirmMut.isPending || !content.trim()}
            >
              确认并下一步
            </button>
          </div>
          {(confirmMut.isError || aiMut.isError) && (
            <p className={styles.error}>
              {((confirmMut.error || aiMut.error) as Error).message}
            </p>
          )}
        </section>
      )}

      {project.artifacts.length > 0 && (
        <section className={styles.history}>
          <h3>已确认步骤</h3>
          <ul>
            {project.artifacts.map((a) => (
              <li key={`${a.step_key}-${a.version}`}>
                <strong>{a.step_key}</strong> v{a.version}
                <pre>{a.content.slice(0, 200)}{a.content.length > 200 ? '…' : ''}</pre>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

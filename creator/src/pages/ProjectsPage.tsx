import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createProject, fetchPipelines, fetchProjects } from '../api/creator'
import { pipelineLabel, statusLabel } from '../lib/labels'
import shared from '../styles/shared.module.css'
import styles from './ProjectsPage.module.css'

const PLATFORMS = [
  { key: 'douyin', label: '抖音' },
  { key: 'xiaohongshu', label: '小红书' },
  { key: 'wechat', label: '公众号' },
  { key: 'bilibili', label: 'B站' },
]

export function ProjectsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  })
  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines'],
    queryFn: fetchPipelines,
  })

  const [title, setTitle] = useState('')
  const [pipelineId, setPipelineId] = useState('short_video')
  const [platforms, setPlatforms] = useState<string[]>(['xiaohongshu'])

  const createMut = useMutation({
    mutationFn: () =>
      createProject({
        pipeline_id: pipelineId,
        title,
        target_platform_keys: platforms,
      }),
    onSuccess: (project) => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
      void queryClient.invalidateQueries({ queryKey: ['usage'] })
      setTitle('')
      navigate(`/projects/${project.id}`)
    },
  })

  function togglePlatform(key: string) {
    setPlatforms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key],
    )
  }

  const canCreate = title.trim().length > 0 && platforms.length > 0 && !createMut.isPending

  return (
    <div className={`${styles.page} animateIn`}>
      <header className={shared.pageHeader}>
        <h1 className={shared.pageTitle}>内容项目</h1>
        <p className={shared.pageSubtitle}>从选题到发布，按流水线推进每一条内容。</p>
      </header>

      <section className={styles.create}>
        <h2 className={shared.panelTitle}>新建项目</h2>
        <label className={shared.fieldLabel}>
          选题 / 灵感
          <input
            className={shared.input}
            placeholder="例如：初夏通勤穿搭 3 件套"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className={shared.fieldLabel}>
          流水线类型
          <select
            className={shared.select}
            value={pipelineId}
            onChange={(e) => setPipelineId(e.target.value)}
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <fieldset className={styles.platformFieldset}>
          <legend className={shared.fieldLabel}>目标平台</legend>
          <div className={styles.platforms}>
            {PLATFORMS.map((p) => {
              const active = platforms.includes(p.key)
              return (
                <button
                  key={p.key}
                  type="button"
                  className={`${styles.platformPill} ${active ? styles.platformPillActive : ''}`}
                  onClick={() => togglePlatform(p.key)}
                  aria-pressed={active}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </fieldset>
        <button
          type="button"
          className={shared.btnPrimary}
          disabled={!canCreate}
          onClick={() => createMut.mutate()}
        >
          {createMut.isPending ? '创建中…' : '开始创作 →'}
        </button>
        {createMut.isError && (
          <p className={shared.error}>{(createMut.error as Error).message}</p>
        )}
      </section>

      <section>
        <h2 className={shared.panelTitle}>进行中的项目</h2>
        {isLoading && <p className={styles.muted}>加载中…</p>}
        <ul className={styles.list}>
          {projects.map((p) => {
            const pipeline = pipelines.find((pl) => pl.id === p.pipeline_id)
            const stepTitle =
              pipeline?.steps.find((s) => s.key === p.current_step_key)?.title ??
              p.current_step_key
            const stepNum =
              (pipeline?.steps.findIndex((s) => s.key === p.current_step_key) ?? 0) + 1
            const total = pipeline?.steps.length ?? 0
            return (
              <li key={p.id}>
                <Link to={`/projects/${p.id}`} className={styles.card}>
                  <div className={styles.cardTop}>
                    <strong>{p.title}</strong>
                    <span
                      className={
                        p.status === 'completed' ? shared.badgeDone : shared.badgeProgress
                      }
                    >
                      {statusLabel(p.status)}
                    </span>
                  </div>
                  <span className={styles.cardMeta}>
                    {pipelineLabel(p.pipeline_id)} · 第 {stepNum}/{total} 步 · {stepTitle}
                  </span>
                  {total > 0 && p.status !== 'completed' && (
                    <div className={styles.progressBar} aria-hidden>
                      <span style={{ width: `${(stepNum / total) * 100}%` }} />
                    </div>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
        {!isLoading && projects.length === 0 && (
          <p className={styles.empty}>还没有项目。填写上方表单，创建你的第一条流水线。</p>
        )}
      </section>
    </div>
  )
}

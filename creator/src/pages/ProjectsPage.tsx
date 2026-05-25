import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createProject, fetchPipelines, fetchProjects } from '../api/creator'
import styles from './ProjectsPage.module.css'

const PLATFORMS = [
  { key: 'douyin', label: '抖音' },
  { key: 'xiaohongshu', label: '小红书' },
  { key: 'wechat', label: '公众号' },
  { key: 'bilibili', label: 'B站' },
]

export function ProjectsPage() {
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
      setTitle('')
    },
  })

  function togglePlatform(key: string) {
    setPlatforms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key],
    )
  }

  return (
    <div className={styles.page}>
      <section className={styles.create}>
        <h2>新建内容项目</h2>
        <input
          placeholder="选题 / 灵感标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select value={pipelineId} onChange={(e) => setPipelineId(e.target.value)}>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <div className={styles.platforms}>
          {PLATFORMS.map((p) => (
            <label key={p.key}>
              <input
                type="checkbox"
                checked={platforms.includes(p.key)}
                onChange={() => togglePlatform(p.key)}
              />
              {p.label}
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={!title.trim() || platforms.length === 0 || createMut.isPending}
          onClick={() => createMut.mutate()}
        >
          创建项目
        </button>
        {createMut.isError && (
          <p className={styles.error}>{(createMut.error as Error).message}</p>
        )}
      </section>

      <section>
        <h2>我的项目</h2>
        {isLoading && <p>加载中…</p>}
        <ul className={styles.list}>
          {projects.map((p) => (
            <li key={p.id}>
              <Link to={`/projects/${p.id}`}>
                <strong>{p.title}</strong>
                <span>
                  {p.pipeline_id} · {p.current_step_key} · {p.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {!isLoading && projects.length === 0 && (
          <p className={styles.empty}>还没有项目，从上方创建第一条流水线。</p>
        )}
      </section>
    </div>
  )
}

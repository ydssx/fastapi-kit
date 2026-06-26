import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { createProject, deleteProject, fetchPipelines, fetchProjects } from '../api/creator'
import { EmptyState } from '../components/EmptyState'
import { PlaygroundIcon, ProjectsIcon } from '../components/icons/NavIcons'
import { LoadingBlock } from '../components/LoadingBlock'
import { PageHeader } from '../components/PageHeader'
import { PipelineThumbnail } from '../components/PipelineThumbnail'
import { PlatformPicker } from '../components/PlatformPicker'
import { ProjectCard } from '../components/ProjectCard'
import {
  QuotaLimitNotice,
  quotaLimitKindFromCode,
  type QuotaLimitKind,
} from '../components/QuotaLimitNotice'
import shared from '../styles/shared.module.css'
import styles from './ProjectsPage.module.css'

const PLATFORMS = [
  { key: 'douyin', label: '抖音', emoji: '🎵' },
  { key: 'xiaohongshu', label: '小红书', emoji: '📕' },
  { key: 'wechat', label: '公众号', emoji: '💬' },
  { key: 'bilibili', label: 'B站', emoji: '📺' },
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
  const [primaryPlatform, setPrimaryPlatform] = useState<string>('xiaohongshu')
  const [quotaError, setQuotaError] = useState<QuotaLimitKind | null>(null)

  const selectedPipeline = pipelines.find((p) => p.id === pipelineId)

  function handlePlatformsChange(next: string[]) {
    setPlatforms(next)
    if (next.length === 1) {
      setPrimaryPlatform(next[0]!)
    } else if (primaryPlatform && !next.includes(primaryPlatform)) {
      setPrimaryPlatform('')
    }
  }

  const primaryReady = platforms.length <= 1 || primaryPlatform.length > 0

  const activeProjects = useMemo(
    () =>
      projects
        .filter((p) => p.status !== 'completed')
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [projects],
  )
  const completedProjects = useMemo(
    () =>
      projects
        .filter((p) => p.status === 'completed')
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [projects],
  )

  const createMut = useMutation({
    mutationFn: () =>
      createProject({
        pipeline_id: pipelineId,
        title,
        target_platform_keys: platforms,
        primary_platform_key: platforms.length === 1 ? platforms[0] : primaryPlatform || null,
      }),
    onSuccess: (project) => {
      setQuotaError(null)
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
      void queryClient.invalidateQueries({ queryKey: ['usage'] })
      setTitle('')
      navigate(`/projects/${project.id}`)
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setQuotaError(quotaLimitKindFromCode(err.code))
      }
    },
  })

  const deleteMut = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  function handleDeleteProject(projectId: string) {
    if (!window.confirm('确定删除此项目？此操作不可恢复。')) return
    deleteMut.mutate(projectId)
  }

  const canCreate =
    title.trim().length > 0 && platforms.length > 0 && primaryReady && !createMut.isPending

  function handleCreateSubmit(e: FormEvent) {
    e.preventDefault()
    if (canCreate) createMut.mutate()
  }

  function renderProjectCards(items: typeof projects) {
    return items.map((p) => {
      const pipeline = pipelines.find((pl) => pl.id === p.pipeline_id)
      const stepTitle =
        pipeline?.steps.find((s) => s.key === p.current_step_key)?.title ?? p.current_step_key
      const stepNum = (pipeline?.steps.findIndex((s) => s.key === p.current_step_key) ?? 0) + 1
      const total = pipeline?.steps.length ?? 0
      return (
        <ProjectCard
          key={p.id}
          project={p}
          pipelineTitle={pipeline?.title}
          stepTitle={stepTitle}
          stepNum={stepNum}
          totalSteps={total}
          onDelete={handleDeleteProject}
          deleting={deleteMut.isPending}
        />
      )
    })
  }

  return (
    <div className={`${shared.page} ${styles.page}`}>
      <PageHeader
        title="内容项目"
        description="通过流水线式的创作流程，高效完成优质内容的策划与制作。"
        actions={
          <Link to="/playground" className={`${shared.btnGhost} ${styles.headerAction}`}>
            <PlaygroundIcon size={16} />
            灵感实验室
          </Link>
        }
      />

      <div className={styles.workspace}>
        <aside className={styles.createAside}>
          <section className={styles.hero} aria-labelledby="create-project-heading">
            <div>
              <p className={styles.heroKicker}>开始创作</p>
              <h2 id="create-project-heading" className={styles.heroTitle}>
                新建内容项目
              </h2>
            </div>
            <form className={styles.createGrid} onSubmit={handleCreateSubmit}>
              <label className={shared.fieldLabel}>
                项目主题
                <input
                  className={shared.input}
                  placeholder="例如：初夏通勤穿搭 3 件套"
                  value={title}
                  onChange={(e) => {
                    setQuotaError(null)
                    setTitle(e.target.value)
                  }}
                  autoFocus={activeProjects.length === 0}
                />
              </label>
              <label className={shared.fieldLabel}>
                选择流水线
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
              {selectedPipeline && (
                <div className={styles.pipelinePreview}>
                  <PipelineThumbnail pipelineId={selectedPipeline.id} size="md" />
                  <div className={styles.pipelinePreviewText}>
                    <span className={styles.pipelinePreviewTitle}>{selectedPipeline.title}</span>
                    <p className={styles.pipelinePreviewDesc}>{selectedPipeline.description}</p>
                    <span className={styles.pipelinePreviewMeta}>
                      {selectedPipeline.steps.length} 个步骤
                    </span>
                  </div>
                </div>
              )}
              <PlatformPicker
                options={PLATFORMS}
                value={platforms}
                onChange={handlePlatformsChange}
                legend="发布平台"
                showPrimary
                primaryKey={primaryPlatform || null}
                onPrimaryChange={setPrimaryPlatform}
              />
              <div className={styles.createActions}>
                <button type="submit" className={shared.btnPrimary} disabled={!canCreate}>
                  {createMut.isPending ? '创建中…' : '开始创作 →'}
                </button>
                <p className={styles.playgroundHint}>
                  还没想好主题？
                  <Link to="/playground"> 去灵感实验室找选题</Link>
                </p>
              </div>
            </form>
            {quotaError && <QuotaLimitNotice kind={quotaError} />}
            {createMut.isError && !quotaError && (
              <p className={shared.error}>{(createMut.error as Error).message}</p>
            )}
          </section>
        </aside>

        <div className={styles.projectsMain}>
          <section className={styles.section}>
            <div className={shared.sectionHead}>
              <h2 className={shared.panelTitle}>进行中的项目</h2>
              {!isLoading && activeProjects.length > 0 && (
                <span className={styles.sectionCount}>{activeProjects.length} 个</span>
              )}
            </div>
            <div className={styles.listPanel}>
              {isLoading && <LoadingBlock label="加载项目…" />}
              {!isLoading && activeProjects.length === 0 && (
                <EmptyState
                  icon={<ProjectsIcon size={22} />}
                  title="还没有项目"
                  description="填写左侧表单创建第一条流水线，或先去灵感实验室生成选题。"
                >
                  <Link to="/playground" className={shared.btnSecondary}>
                    去灵感实验室
                  </Link>
                </EmptyState>
              )}
              {!isLoading && activeProjects.length > 0 && (
                <ul className={styles.list}>{renderProjectCards(activeProjects)}</ul>
              )}
            </div>
          </section>

          {!isLoading && completedProjects.length > 0 && (
            <section className={`${styles.section} ${styles.completedSection} ${shared.noPageStagger}`}>
              <div className={shared.sectionHead}>
                <h2 className={shared.panelTitle}>已完成</h2>
                <span className={styles.sectionCount}>{completedProjects.length} 个</span>
              </div>
              <div className={styles.listPanel}>
                <ul className={styles.list}>{renderProjectCards(completedProjects)}</ul>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

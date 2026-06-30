import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { createProject, deleteProject, fetchPipelines, fetchProjects, saveDraft } from '../api/creator'
import { EmptyState } from '../components/EmptyState'
import { PlaygroundIcon, ProjectsIcon } from '../components/icons/NavIcons'
import { LoadingBlock } from '../components/LoadingBlock'
import { PageHeader } from '../components/PageHeader'
import { PipelineThumbnail } from '../components/PipelineThumbnail'
import { PlatformPicker } from '../components/PlatformPicker'
import { ProjectCard } from '../components/ProjectCard'
import { ProjectSprintCard } from '../components/ProjectSprintCard'
import {
  QuotaLimitNotice,
  quotaLimitKindFromCode,
  type QuotaLimitKind,
} from '../components/QuotaLimitNotice'
import { buildProjectPriorityView, type RankedProject } from '../lib/projectPriority'
import { TopicSeedPanel } from '../components/TopicSeedPanel'
import type { PlaygroundTopic } from '../types/api'
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
  const [seedPanelOpen, setSeedPanelOpen] = useState(false)
  const [topicDraft, setTopicDraft] = useState<string | null>(null)
  const [seedTopic, setSeedTopic] = useState<PlaygroundTopic | null>(null)

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

  const priorityView = useMemo(() => buildProjectPriorityView(projects, pipelines), [projects, pipelines])
  const activeProjects = priorityView.activeProjects
  const sprintProjects = priorityView.sprintProjects
  const otherActiveProjects = priorityView.otherActiveProjects
  const completedProjects = priorityView.completedProjects
  const featuredSprintProject = sprintProjects[0]
  const sprintQueue = sprintProjects.slice(1)
  const hasActiveProjects = activeProjects.length > 0
  const hasSprintProjects = sprintProjects.length > 0

  const createMut = useMutation({
    mutationFn: () =>
      createProject({
        pipeline_id: pipelineId,
        title,
        target_platform_keys: platforms,
        primary_platform_key: platforms.length === 1 ? platforms[0] : primaryPlatform || null,
      }),
    onSuccess: async (project) => {
      setQuotaError(null)

      let draft = topicDraft
      if (seedTopic && title.trim()) {
        draft = `# ${title.trim()}\n\n${seedTopic.reason.trim()}`
      }
      const draftToSave = draft

      void queryClient.invalidateQueries({ queryKey: ['projects'] })
      void queryClient.invalidateQueries({ queryKey: ['usage'] })
      setTitle('')
      setTopicDraft(null)
      setSeedTopic(null)
      setSeedPanelOpen(false)

      if (draftToSave?.trim()) {
        try {
          await saveDraft(project.id, 'topic', draftToSave)
        } catch {
          navigate(`/projects/${project.id}`, {
            state: { draftWarning: '选题草稿未写入，请在项目内手动保存。' },
          })
          return
        }
      }

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

  function renderProjectCards(items: RankedProject[]) {
    return items.map((item) => {
      return (
        <ProjectCard
          key={item.project.id}
          project={item.project}
          pipelineTitle={item.pipeline?.title}
          stepTitle={item.stepTitle}
          stepNum={item.stepNum}
          totalSteps={item.totalSteps}
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
        description="优先推进最接近发布的项目，一眼看清下一步该做什么。"
        actions={
          <Link to="/playground" className={`${shared.btnGhost} ${styles.headerAction}`}>
            <PlaygroundIcon size={16} />
            灵感实验室
          </Link>
        }
      />

      <div
        className={`${styles.workspace} ${hasSprintProjects ? styles.workspaceWithSprint : ''}`}
      >
        <div className={styles.projectsMain}>
          {isLoading && (
            <section className={styles.section}>
              <div className={styles.listPanel}>
                <LoadingBlock label="加载项目…" />
              </div>
            </section>
          )}

          {!isLoading && hasSprintProjects && featuredSprintProject && (
            <section className={`${styles.section} ${styles.sprintSection}`}>
              <div className={styles.sprintHead}>
                <p className={styles.sprintKicker}>冲刺优先</p>
                <div className={styles.sprintTitleRow}>
                  <h2 className={shared.panelTitle}>发布冲刺</h2>
                  <span className={styles.sectionCount}>{sprintProjects.length} 个</span>
                </div>
                <p className={styles.sectionHint}>先把最接近发布的项目推过终点线。</p>
              </div>
              <div
                className={`${styles.sprintLayout} ${
                  sprintQueue.length === 0 ? styles.sprintLayoutSingle : ''
                }`}
              >
                <div className={styles.sprintSpotlight}>
                  <ProjectSprintCard item={featuredSprintProject} featured />
                </div>
                {sprintQueue.length > 0 && (
                  <div className={styles.sprintQueue}>
                    <div className={styles.queueHead}>
                      <h3 className={styles.queueTitle}>接下来可继续推进</h3>
                      <span className={styles.queueMeta}>{sprintQueue.length} 个</span>
                    </div>
                    <div className={styles.queueList}>
                      {sprintQueue.map((item) => (
                        <ProjectSprintCard key={item.project.id} item={item} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {!isLoading && !hasActiveProjects && (
            <section className={styles.section}>
              <div className={shared.sectionHead}>
                <h2 className={shared.panelTitle}>开始你的第一个内容项目</h2>
              </div>
              <div className={styles.listPanel}>
                <EmptyState
                  icon={<ProjectsIcon size={22} />}
                  title="还没有项目"
                  description="填写左侧表单创建第一条流水线，或先去灵感实验室生成选题。"
                >
                  <Link to="/playground" className={shared.btnSecondary}>
                    去灵感实验室
                  </Link>
                </EmptyState>
              </div>
            </section>
          )}

          {!isLoading && hasActiveProjects && !hasSprintProjects && (
            <section className={styles.section}>
              <div className={shared.sectionHead}>
                <div>
                  <h2 className={shared.panelTitle}>继续创作</h2>
                  <p className={styles.sectionHint}>这些项目还没进入最后冲刺阶段，继续把它们往前推。</p>
                </div>
                <span className={styles.sectionCount}>{activeProjects.length} 个</span>
              </div>
              <div className={styles.listPanel}>
                <ul className={styles.list}>{renderProjectCards(activeProjects)}</ul>
              </div>
            </section>
          )}

          {!isLoading && hasSprintProjects && otherActiveProjects.length > 0 && (
            <section className={styles.section}>
              <div className={shared.sectionHead}>
                <div>
                  <h2 className={shared.panelTitle}>其他进行中的项目</h2>
                  <p className={styles.sectionHint}>这些项目仍可继续创作，但暂时不在发布冲刺区。</p>
                </div>
                <span className={styles.sectionCount}>{otherActiveProjects.length} 个</span>
              </div>
              <div className={styles.listPanel}>
                <ul className={styles.list}>{renderProjectCards(otherActiveProjects)}</ul>
              </div>
            </section>
          )}

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

        <aside className={styles.createAside}>
          <section
            className={`${styles.hero} ${hasActiveProjects ? styles.heroSecondary : ''}`}
            aria-labelledby="create-project-heading"
          >
            <div>
              <p className={styles.heroKicker}>{hasActiveProjects ? '新的方向' : '开始创作'}</p>
              <h2 id="create-project-heading" className={styles.heroTitle}>
                新建内容项目
              </h2>
              <p className={styles.createLead}>
                {hasActiveProjects
                  ? '先冲刺临近发布的项目，新的想法也可以随时在这里开启。'
                  : '定下主题、平台和流水线，马上开始下一条内容的创作。'}
              </p>
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
                  autoFocus={!hasActiveProjects}
                />
              </label>
              <p className={styles.seedToggle}>
                {!seedPanelOpen ? (
                  <button
                    type="button"
                    className={styles.seedLink}
                    onClick={() => setSeedPanelOpen(true)}
                  >
                    只有方向？AI 帮你想标题
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.seedLink}
                    onClick={() => setSeedPanelOpen(false)}
                  >
                    收起标题助手
                  </button>
                )}
              </p>
              {seedPanelOpen && (
                <TopicSeedPanel
                  onSelect={(topic, draft) => {
                    setSeedTopic(topic)
                    setTopicDraft(draft)
                    setTitle(topic.title)
                  }}
                  onQuotaError={() => setQuotaError('playground')}
                  onRegenerate={() => {
                    setSeedTopic(null)
                    setTopicDraft(null)
                    setTitle('')
                  }}
                />
              )}
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
      </div>
    </div>
  )
}

import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { formatRelativeTime } from '../lib/format'
import { pipelineLabel, platformLabel, statusLabel } from '../lib/labels'
import type { Project } from '../types/api'
import shared from '../styles/shared.module.css'
import { PipelineThumbnail } from './PipelineThumbnail'
import styles from './ProjectCard.module.css'

interface ProjectCardProps {
  project: Project
  pipelineTitle?: string
  stepTitle?: string
  stepNum: number
  totalSteps: number
  onDelete?: (projectId: string) => void
  deleting?: boolean
}

export function ProjectCard({
  project,
  pipelineTitle,
  stepTitle,
  stepNum,
  totalSteps,
  onDelete,
  deleting,
}: ProjectCardProps) {
  const onPublishStep = project.current_step_key === 'publish' && project.status !== 'completed'
  const completed = project.status === 'completed'
  const showProgress = totalSteps > 0 && (completed || !onPublishStep)

  function handleDelete(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onDelete?.(project.id)
  }

  const progressPct =
    totalSteps > 0 ? Math.round(((completed ? totalSteps : stepNum) / totalSteps) * 100) : 0

  const platforms = project.target_platforms ?? []
  const primaryKey = project.primary_platform_key

  return (
    <li className={styles.row}>
      <Link
        to={`/projects/${project.id}`}
        className={`${styles.card} ${completed ? styles.cardDone : ''}`}
      >
        <PipelineThumbnail pipelineId={project.pipeline_id} className={styles.thumb} size="lg" />
        <div className={styles.body}>
          <div className={styles.top}>
            <strong>{project.title}</strong>
            <span className={completed ? shared.badgeDone : shared.badgeProgress}>
              {onPublishStep && project.publish_progress
                ? project.publish_progress.summary_label
                : statusLabel(project.status)}
            </span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.meta}>
              {pipelineTitle ?? pipelineLabel(project.pipeline_id)}
              {onPublishStep ? (
                <> · 发布核对</>
              ) : (
                <>
                  {' · 第 '}
                  {stepNum}/{totalSteps} 步
                  {stepTitle ? ` · ${stepTitle}` : ''}
                </>
              )}
            </span>
            <time className={styles.time} dateTime={project.updated_at}>
              {formatRelativeTime(project.updated_at)}
            </time>
          </div>
          {platforms.length > 0 && (
            <div className={styles.platforms}>
              {platforms.map((key) => (
                <span
                  key={key}
                  className={`${styles.platformChip} ${key === primaryKey ? styles.platformPrimary : ''}`}
                >
                  {platformLabel(key)}
                </span>
              ))}
            </div>
          )}
          {showProgress && (
            <div className={styles.progressTrack} aria-label={`进度 ${stepNum}/${totalSteps}`}>
              <div className={styles.progressBar}>
                <span
                  className={completed ? styles.progressFillDone : styles.progressFill}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className={styles.progressLabel}>
                {completed ? '完成' : `${progressPct}%`}
              </span>
            </div>
          )}
        </div>
        <span className={styles.chevron} aria-hidden>
          →
        </span>
      </Link>
      {onDelete && (
        <button
          type="button"
          className={styles.deleteBtn}
          onClick={handleDelete}
          disabled={deleting}
          aria-label={`删除项目 ${project.title}`}
        >
          删除
        </button>
      )}
    </li>
  )
}

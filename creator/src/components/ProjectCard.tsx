import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Project } from '../types/api'
import { pipelineLabel, statusLabel } from '../lib/labels'
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
  const pct = totalSteps > 0 ? Math.round((stepNum / totalSteps) * 100) : 0
  const inProgress = project.status !== 'completed'

  function handleDelete(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onDelete?.(project.id)
  }

  return (
    <li className={styles.row}>
      <Link to={`/projects/${project.id}`} className={styles.card}>
        <PipelineThumbnail pipelineId={project.pipeline_id} className={styles.thumb} size="lg" />
        <div className={styles.body}>
          <div className={styles.top}>
            <strong>{project.title}</strong>
            <span className={project.status === 'completed' ? shared.badgeDone : shared.badgeProgress}>
              {onPublishStep && project.publish_progress
                ? project.publish_progress.summary_label
                : statusLabel(project.status)}
            </span>
          </div>
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
          {inProgress && !onPublishStep && totalSteps > 0 && (
            <div className={styles.progressWrap}>
              <div className={styles.progressBar} aria-hidden>
                <span style={{ width: `${pct}%` }} />
              </div>
              <span className={styles.pct}>{pct}%</span>
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

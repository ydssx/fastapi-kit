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
}

export function ProjectCard({
  project,
  pipelineTitle,
  stepTitle,
  stepNum,
  totalSteps,
}: ProjectCardProps) {
  const pct = totalSteps > 0 ? Math.round((stepNum / totalSteps) * 100) : 0
  const inProgress = project.status !== 'completed'

  return (
    <li>
      <Link to={`/projects/${project.id}`} className={styles.card}>
        <PipelineThumbnail pipelineId={project.pipeline_id} className={styles.thumb} size="lg" />
        <div className={styles.body}>
          <div className={styles.top}>
            <strong>{project.title}</strong>
            <span className={project.status === 'completed' ? shared.badgeDone : shared.badgeProgress}>
              {statusLabel(project.status)}
            </span>
          </div>
          <span className={styles.meta}>
            {pipelineTitle ?? pipelineLabel(project.pipeline_id)} · 第 {stepNum}/{totalSteps} 步
            {stepTitle ? ` · ${stepTitle}` : ''}
          </span>
          {inProgress && totalSteps > 0 && (
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
    </li>
  )
}

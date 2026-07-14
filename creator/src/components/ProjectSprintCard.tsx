import { Link } from 'react-router-dom'
import { formatRelativeTime } from '../lib/format'
import type { RankedProject } from '../lib/projectPriority'
import { pipelineLabel, platformLabel } from '../lib/labels'
import shared from '../styles/shared.module.css'
import { PipelineThumbnail } from './PipelineThumbnail'
import styles from './ProjectSprintCard.module.css'

interface ProjectSprintCardProps {
  item: RankedProject
  featured?: boolean
}

export function ProjectSprintCard({ item, featured = false }: ProjectSprintCardProps) {
  const pipelineTitle = item.pipeline?.title ?? pipelineLabel(item.project.pipeline_id)
  const platforms = item.project.target_platforms ?? []
  const primaryKey = item.project.primary_platform_key
  const badgeLabel = item.isPublishStep
    ? item.project.publish_progress?.summary_label ?? '发布核对中'
    : `第 ${item.stepNum}/${item.totalSteps} 步`

  if (!featured) {
    return (
      <Link
        to={`/projects/${item.project.id}`}
        className={`${styles.card} ${styles.compact} ${item.isPublishStep ? styles.publishStep : ''}`}
      >
        <PipelineThumbnail pipelineId={item.project.pipeline_id} size="md" className={styles.compactThumb} />
        <div className={styles.compactBody}>
          <div className={styles.compactTop}>
            <strong className={styles.compactTitle}>{item.project.title}</strong>
            <span className={shared.badgeProgress}>{badgeLabel}</span>
          </div>
          <p className={styles.compactMeta}>
            {item.sprintLabel}
            {' · '}
            {pipelineTitle}
          </p>
          {item.totalSteps > 0 && (
            <div className={styles.compactProgress} aria-hidden>
              <span className={styles.compactProgressFill} style={{ width: `${item.progressPct}%` }} />
            </div>
          )}
        </div>
        <span className={styles.compactChevron} aria-hidden>
          →
        </span>
      </Link>
    )
  }

  return (
    <Link
      to={`/projects/${item.project.id}`}
      className={`${styles.card} ${styles.featured} ${item.isPublishStep ? styles.publishStep : ''}`}
    >
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <span className={styles.eyebrow}>最接近发布</span>
          <strong className={styles.title}>{item.project.title}</strong>
        </div>
        <span className={item.isPublishStep ? shared.badgeDone : shared.badgeProgress}>{badgeLabel}</span>
      </div>

      <div className={styles.body}>
        <div className={styles.thumbWrap}>
          <PipelineThumbnail pipelineId={item.project.pipeline_id} size="lg" />
        </div>

        <div className={styles.content}>
          <div className={styles.metaRow}>
            <span className={styles.meta}>
              {pipelineTitle}
              {item.totalSteps > 0 && !item.isPublishStep ? ` · ${item.stepTitle}` : ''}
              {item.isPublishStep ? ' · 发布核对' : ''}
            </span>
            <time className={styles.time} dateTime={item.project.updated_at}>
              {formatRelativeTime(item.project.updated_at)}
            </time>
          </div>

          <p className={styles.summary}>{item.sprintSummary}</p>
          <p className={styles.nextAction}>{item.nextAction}</p>

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

          {item.totalSteps > 0 && (
            <div className={styles.progressRow}>
              <div className={styles.progressBar} aria-hidden>
                <span
                  className={item.isPublishStep ? styles.progressFillPublish : styles.progressFill}
                  style={{ width: `${item.progressPct}%` }}
                />
              </div>
              <span className={styles.progressLabel}>{item.progressPct}%</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        <span className={styles.cta}>{item.ctaLabel}</span>
      </div>
    </Link>
  )
}

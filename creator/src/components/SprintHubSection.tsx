import { ProjectSprintCard } from './ProjectSprintCard'
import type { RankedProject } from '../lib/projectPriority'
import shared from '../styles/shared.module.css'
import styles from '../pages/ProjectsPage.module.css'

interface SprintHubSectionProps {
  featured: RankedProject
  queue: RankedProject[]
  totalCount: number
}

export function SprintHubSection({ featured, queue, totalCount }: SprintHubSectionProps) {
  return (
    <section className={`${styles.section} ${styles.sprintSection}`}>
      <div className={styles.sprintHead}>
        <div className={styles.sprintTitleRow}>
          <h2 className={shared.panelTitle}>发布冲刺</h2>
          <span className={styles.sectionCount}>{totalCount} 个</span>
        </div>
        <p className={styles.sectionHint}>先把最接近发布的项目推过终点线。</p>
      </div>
      <div
        className={`${styles.sprintLayout} ${queue.length === 0 ? styles.sprintLayoutSingle : ''}`}
      >
        <div className={styles.sprintSpotlight}>
          <ProjectSprintCard item={featured} featured />
        </div>
        {queue.length > 0 && (
          <div className={styles.sprintQueue}>
            <div className={styles.queueHead}>
              <h3 className={styles.queueTitle}>接下来可继续推进</h3>
              <span className={styles.queueMeta}>{queue.length} 个</span>
            </div>
            <div className={styles.queueList}>
              {queue.map((item) => (
                <ProjectSprintCard key={item.project.id} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

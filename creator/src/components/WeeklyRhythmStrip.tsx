import styles from './WeeklyRhythmStrip.module.css'

interface WeeklyRhythmStripProps {
  target: number
  inProgress: number
  completedThisWeek: number
}

export function WeeklyRhythmStrip({
  target,
  inProgress,
  completedThisWeek,
}: WeeklyRhythmStripProps) {
  return (
    <div className={styles.strip} role="status" aria-label="本周发布节奏">
      <span className={styles.label}>本周节奏</span>
      <span className={styles.stat}>
        目标 <em>{target}</em>
      </span>
      <span className={styles.stat}>
        在制 <em>{inProgress}</em>
      </span>
      <span className={styles.stat}>
        本周完成 <em>{completedThisWeek}</em>
      </span>
    </div>
  )
}

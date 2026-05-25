import shared from '../styles/shared.module.css'
import styles from './CompletedBanner.module.css'

interface CompletedBannerProps {
  title: string
}

export function CompletedBanner({ title }: CompletedBannerProps) {
  return (
    <div className={styles.banner}>
      <span className={styles.icon} aria-hidden>
        ✓
      </span>
      <div>
        <h1 className={shared.pageTitle}>{title}</h1>
        <p className={styles.done}>流水线已完成，内容已归档。</p>
      </div>
    </div>
  )
}

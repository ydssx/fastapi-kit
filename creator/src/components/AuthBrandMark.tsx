import { CreatorMark } from './icons/CreatorMark'
import styles from './AuthBrandMark.module.css'

interface AuthBrandMarkProps {
  /** 仅显示 Mark，不显示文字（卡片内紧凑场景） */
  compact?: boolean
}

export function AuthBrandMark({ compact = false }: AuthBrandMarkProps) {
  return (
    <div className={compact ? styles.rootCompact : styles.root}>
      <span className={styles.mark} aria-hidden>
        <CreatorMark size={compact ? 20 : 24} />
      </span>
      {!compact && (
        <div className={styles.text}>
          <span className={styles.name}>创作者工作台</span>
          <span className={styles.tag}>内容流水线</span>
        </div>
      )}
    </div>
  )
}

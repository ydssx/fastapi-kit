import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
  children?: ReactNode
}

export function EmptyState({ icon, title, description, children }: EmptyStateProps) {
  return (
    <div className={styles.root}>
      {icon && (
        <span className={styles.icon} aria-hidden>
          {icon}
        </span>
      )}
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      {children && <div className={styles.actions}>{children}</div>}
    </div>
  )
}

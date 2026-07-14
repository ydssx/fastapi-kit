import type { ReactNode } from 'react'
import shared from '../styles/shared.module.css'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className={shared.pageHeader}>
      <div>
        <h1 className={shared.pageTitle}>{title}</h1>
        {description && <p className={shared.pageSubtitle}>{description}</p>}
      </div>
      {actions && <div className={shared.toolbar}>{actions}</div>}
    </header>
  )
}

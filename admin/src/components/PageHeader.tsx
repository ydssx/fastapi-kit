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
        <h2 className={shared.pageTitle}>{title}</h2>
        {description && <p className={shared.pageDesc}>{description}</p>}
      </div>
      {actions && <div className={shared.toolbar}>{actions}</div>}
    </header>
  )
}

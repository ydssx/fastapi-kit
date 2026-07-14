import type { ReactNode } from 'react'
import shared from '../styles/shared.module.css'

interface PageHeaderProps {
  /** 省略时由布局顶栏承担页面名；详情页等可传入实体标题（如用户邮箱） */
  title?: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  const slim = !title

  return (
    <header className={slim ? `${shared.pageHeader} ${shared.pageHeaderSlim}` : shared.pageHeader}>
      <div>
        {title && <h2 className={shared.pageTitle}>{title}</h2>}
        {description && <p className={shared.pageDesc}>{description}</p>}
      </div>
      {actions && <div className={shared.headerActions}>{actions}</div>}
    </header>
  )
}

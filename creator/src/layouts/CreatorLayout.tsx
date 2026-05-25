import { Link, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { fetchUsage } from '../api/creator'
import styles from './CreatorLayout.module.css'

const NAV = [
  { to: '/', label: '项目' },
  { to: '/brand', label: '品牌档案' },
]

export function CreatorLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const { data: usage } = useQuery({ queryKey: ['usage'], queryFn: fetchUsage })

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.mark}>创</span>
          <span>创作者工作台</span>
        </div>
        <nav className={styles.nav}>
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={
                location.pathname === item.to ||
                (item.to === '/' && location.pathname.startsWith('/projects'))
                  ? styles.navActive
                  : undefined
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.meta}>
          {usage && (
            <span className={styles.usage}>
              本月 {usage.completed_projects}/{usage.completed_projects_limit} 完成 · AI{' '}
              {usage.ai_calls}/{usage.ai_calls_limit}
            </span>
          )}
          <span className={styles.email}>{user?.email}</span>
          <button type="button" className={styles.logout} onClick={logout}>
            退出
          </button>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}

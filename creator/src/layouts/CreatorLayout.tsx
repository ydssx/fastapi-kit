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

  const projectPct = usage
    ? Math.min(100, (usage.completed_projects / usage.completed_projects_limit) * 100)
    : 0
  const aiPct = usage
    ? Math.min(100, (usage.ai_calls / usage.ai_calls_limit) * 100)
    : 0

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.mark} aria-hidden>
            ✦
          </span>
          <div>
            <span className={styles.brandName}>创作者工作台</span>
            <span className={styles.brandTag}>流水线</span>
          </div>
        </div>
        <nav className={styles.nav} aria-label="主导航">
          {NAV.map((item) => {
            const active =
              location.pathname === item.to ||
              (item.to === '/' && location.pathname.startsWith('/projects'))
            return (
              <Link
                key={item.to}
                to={item.to}
                className={active ? styles.navActive : undefined}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className={styles.meta}>
          {usage && (
            <div className={styles.quota} title="本月用量">
              <div className={styles.quotaRow}>
                <span>完成 {usage.completed_projects}/{usage.completed_projects_limit}</span>
                <div className={styles.quotaBar}>
                  <span style={{ width: `${projectPct}%` }} />
                </div>
              </div>
              <div className={styles.quotaRow}>
                <span>AI {usage.ai_calls}/{usage.ai_calls_limit}</span>
                <div className={styles.quotaBar}>
                  <span style={{ width: `${aiPct}%` }} />
                </div>
              </div>
            </div>
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

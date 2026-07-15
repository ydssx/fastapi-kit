import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { NavIcon } from '../components/NavIcon'
import styles from './AdminLayout.module.css'

const NAV = [
  { to: '/', label: '仪表盘', end: true, icon: 'dashboard' as const },
  { to: '/users', label: '用户管理', icon: 'users' as const },
  { to: '/celery', label: 'Celery', icon: 'celery' as const },
  { to: '/audit', label: '审计日志', icon: 'audit' as const },
  { to: '/alerts', label: '告警', icon: 'alerts' as const },
  { to: '/logs', label: '日志', icon: 'logs' as const },
]

function userInitial(email: string | undefined) {
  if (!email) return '?'
  return email.charAt(0).toUpperCase()
}

export function AdminLayout() {
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className={`${styles.shell} ${collapsed ? styles.collapsed : ''}`}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>FK</span>
          {!collapsed && <span className={styles.brandText}>fastapi-kit</span>}
        </div>
        <nav className={styles.nav}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
              }
            >
              <NavIcon name={item.icon} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          className={styles.collapseBtn}
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? '展开侧栏' : '收起侧栏'}
        >
          {collapsed ? '»' : '«'}
        </button>
      </aside>
      <div className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.headerTitle}>管理后台</h1>
          <div className={styles.headerRight}>
            <span className={styles.userChip}>
              <span className={styles.avatar} aria-hidden>
                {userInitial(user?.email)}
              </span>
              {user?.email}
            </span>
            <button type="button" className={styles.logoutBtn} onClick={logout}>
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              退出
            </button>
          </div>
        </header>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

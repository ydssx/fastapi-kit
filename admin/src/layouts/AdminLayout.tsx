import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import styles from './AdminLayout.module.css'

const NAV = [
  { to: '/', label: '仪表盘', end: true },
  { to: '/users', label: '用户管理' },
  { to: '/celery', label: 'Celery' },
  { to: '/audit', label: '审计日志' },
]

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
              {item.label}
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
            <span className={styles.email}>{user?.email}</span>
            <button type="button" className={styles.logoutBtn} onClick={logout}>
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

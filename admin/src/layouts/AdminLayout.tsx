import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AdminBrandMark } from '../components/AdminBrandMark'
import { NavIcon } from '../components/NavIcon'
import styles from './AdminLayout.module.css'

const NAV_GROUPS = [
  {
    label: '概览',
    items: [{ to: '/', label: '系统概览', end: true, icon: 'dashboard' as const }],
  },
  {
    label: '治理',
    items: [
      { to: '/users', label: '用户管理', icon: 'users' as const },
      { to: '/alerts', label: '告警规则', icon: 'alerts' as const },
    ],
  },
  {
    label: '观测',
    items: [
      { to: '/logs', label: '应用日志', icon: 'logs' as const },
      { to: '/audit', label: '审计日志', icon: 'audit' as const },
      { to: '/celery', label: 'Celery', icon: 'celery' as const },
    ],
  },
] as const

const PAGE_TITLES: Record<string, string> = {
  '/': '系统概览',
  '/users': '用户管理',
  '/celery': 'Celery 监控',
  '/audit': '审计日志',
  '/alerts': '告警规则',
  '/logs': '应用日志',
}

function userInitial(email: string | undefined) {
  if (!email) return '?'
  return email.charAt(0).toUpperCase()
}

function resolvePageTitle(pathname: string) {
  if (pathname.startsWith('/users/')) return '用户详情'
  return PAGE_TITLES[pathname] ?? '运维控制台'
}

export function AdminLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const pageTitle = resolvePageTitle(location.pathname)

  return (
    <div className={`${styles.shell} ${collapsed ? styles.collapsed : ''}`}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <AdminBrandMark size={34} />
          {!collapsed && (
            <div className={styles.brandCopy}>
              <span className={styles.brandName}>fastapi-kit</span>
              <span className={styles.brandTag}>运维控制台</span>
            </div>
          )}
        </div>

        <nav className={styles.nav} aria-label="主导航">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className={styles.navGroup}>
              {!collapsed && <span className={styles.navGroupLabel}>{group.label}</span>}
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={'end' in item ? item.end : undefined}
                  className={({ isActive }) =>
                    isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <NavIcon name={item.icon} />
                  <span
                    className={
                      collapsed ? `${styles.navText} ${styles.navTextHidden}` : styles.navText
                    }
                  >
                    {item.label}
                  </span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className={styles.sidebarFoot}>
          {!collapsed && user?.email && (
            <div className={styles.userBlock}>
              <span className={styles.avatar} aria-hidden>
                {userInitial(user.email)}
              </span>
              <span className={styles.userEmail}>{user.email}</span>
            </div>
          )}
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? '展开侧栏' : '收起侧栏'}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLead}>
            <span className={styles.signalPulse} aria-hidden />
            <div>
              <p className={styles.headerEyebrow}>运维控制台</p>
              <h1 className={styles.headerTitle}>{pageTitle}</h1>
            </div>
          </div>
          <div className={styles.headerRight}>
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

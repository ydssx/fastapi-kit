import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { fetchUsage } from '../api/creator'
import { QuotaDisplay } from '../components/QuotaDisplay'
import styles from './CreatorLayout.module.css'

const NAV = [
  { to: '/', label: '项目', icon: '◈' },
  { to: '/playground', label: '灵感实验室', icon: '✦' },
  { to: '/brand', label: '品牌档案', icon: '◇' },
  { to: '/account', label: '账号', icon: '○' },
]

export function CreatorLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const { data: usage } = useQuery({ queryKey: ['usage'], queryFn: fetchUsage })

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  function isActive(to: string) {
    return (
      location.pathname === to ||
      (to === '/' && location.pathname.startsWith('/projects')) ||
      (to === '/playground' && location.pathname.startsWith('/playground'))
    )
  }

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="工作台导航">
        <div className={styles.sidebarTop}>
          <Link to="/" className={styles.brand} onClick={closeMenu}>
            <span className={styles.mark} aria-hidden>
              ✦
            </span>
            <div className={styles.brandText}>
              <span className={styles.brandName}>创作者工作台</span>
              <span className={styles.brandTag}>内容流水线</span>
            </div>
          </Link>

          <nav className={styles.nav} aria-label="主导航">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={isActive(item.to) ? styles.navActive : styles.navLink}
                onClick={closeMenu}
                aria-current={isActive(item.to) ? 'page' : undefined}
              >
                <span className={styles.navIcon} aria-hidden>
                  {item.icon}
                </span>
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className={styles.sidebarBottom}>
          {usage && <QuotaDisplay usage={usage} />}
          <div className={styles.userRow}>
            <span className={styles.email} title={user?.email ?? ''}>
              {user?.email}
            </span>
            <button type="button" className={styles.logout} onClick={logout}>
              退出
            </button>
          </div>
        </div>
      </aside>

      <div className={styles.content}>
        <header className={styles.mobileHeader}>
          <Link to="/" className={styles.mobileBrand} onClick={closeMenu}>
            <span className={styles.mark} aria-hidden>
              ✦
            </span>
            <span className={styles.brandName}>创作者工作台</span>
          </Link>

          <button
            type="button"
            className={styles.menuBtn}
            aria-expanded={menuOpen}
            aria-controls="creator-mobile-panel"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className={styles.menuIcon} aria-hidden>
              {menuOpen ? '×' : '≡'}
            </span>
            <span className="sr-only">{menuOpen ? '关闭菜单' : '打开菜单'}</span>
          </button>
        </header>

        {menuOpen && (
          <div id="creator-mobile-panel" className={styles.mobilePanel}>
            <nav className={styles.mobileNav} aria-label="主导航">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={isActive(item.to) ? styles.navActive : styles.navLink}
                  onClick={closeMenu}
                >
                  <span className={styles.navIcon} aria-hidden>
                    {item.icon}
                  </span>
                  <span className={styles.navLabel}>{item.label}</span>
                </Link>
              ))}
            </nav>
            {usage && <QuotaDisplay usage={usage} compact />}
            <div className={styles.mobileMeta}>
              <span className={styles.emailMobile}>{user?.email}</span>
              <button type="button" className={styles.logout} onClick={logout}>
                退出
              </button>
            </div>
          </div>
        )}

        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

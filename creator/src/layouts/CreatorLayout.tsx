import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { fetchUsage } from '../api/creator'
import { QuotaDisplay } from '../components/QuotaDisplay'
import { UserMenu } from '../components/UserMenu'
import { CreatorMark } from '../components/icons/CreatorMark'
import {
  AssetsIcon,
  BrandIcon,
  PlaygroundIcon,
  ProjectsIcon,
} from '../components/icons/NavIcons'
import styles from './CreatorLayout.module.css'

type NavAccent = 'accent' | 'ai'

const NAV: {
  to: string
  label: string
  Icon: typeof ProjectsIcon
  accent?: NavAccent
}[] = [
  { to: '/', label: '项目', Icon: ProjectsIcon },
  { to: '/assets', label: '图片素材库', Icon: AssetsIcon },
  { to: '/playground', label: '灵感实验室', Icon: PlaygroundIcon, accent: 'ai' },
  { to: '/brand', label: '品牌档案', Icon: BrandIcon },
]

export function CreatorLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const { data: usage } = useQuery({ queryKey: ['usage'], queryFn: fetchUsage })

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  function isActive(to: string) {
    return (
      location.pathname === to ||
      (to === '/' && location.pathname.startsWith('/projects')) ||
      (to === '/assets' && location.pathname.startsWith('/assets')) ||
      (to === '/playground' && location.pathname.startsWith('/playground'))
    )
  }

  function navClassName(to: string, accent?: NavAccent) {
    if (!isActive(to)) return styles.navLink
    return accent === 'ai' ? styles.navActiveAi : styles.navActive
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
              <CreatorMark size={22} />
            </span>
            <div className={styles.brandText}>
              <span className={styles.brandName}>创作者工作台</span>
              <span className={styles.brandTag}>内容流水线</span>
            </div>
          </Link>

          <nav className={styles.nav} aria-label="主导航">
            {NAV.map(({ to, label, Icon, accent }) => (
              <Link
                key={to}
                to={to}
                className={navClassName(to, accent)}
                onClick={closeMenu}
                aria-current={isActive(to) ? 'page' : undefined}
              >
                <span className={styles.navIcon} aria-hidden>
                  <Icon />
                </span>
                <span className={styles.navLabel}>{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      <div className={styles.content}>
        <header className={styles.topBar}>
          <div className={styles.topBarSpacer} aria-hidden />
          {usage && (
            <div className={styles.topQuota}>
              <QuotaDisplay usage={usage} compact />
            </div>
          )}
          <UserMenu email={user?.email} usage={usage} onLogout={logout} />
        </header>

        <header className={styles.mobileHeader}>
          <Link to="/" className={styles.mobileBrand} onClick={closeMenu}>
            <span className={styles.mark} aria-hidden>
              <CreatorMark size={22} />
            </span>
            <span className={styles.brandName}>创作者工作台</span>
          </Link>

          <div className={styles.mobileHeaderActions}>
            <UserMenu
              email={user?.email}
              usage={usage}
              showQuota
              onLogout={logout}
              onNavigate={closeMenu}
            />
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
          </div>
        </header>

        {menuOpen && (
          <div
            id="creator-mobile-panel"
            className={styles.mobilePanel}
            role="dialog"
            aria-modal="true"
            aria-label="主导航"
          >
            <nav className={styles.mobileNav} aria-label="主导航">
              {NAV.map(({ to, label, Icon, accent }) => (
                <Link
                  key={to}
                  to={to}
                  className={navClassName(to, accent)}
                  onClick={closeMenu}
                  aria-current={isActive(to) ? 'page' : undefined}
                >
                  <span className={styles.navIcon} aria-hidden>
                    <Icon />
                  </span>
                  <span className={styles.navLabel}>{label}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}

        <main className={styles.main} inert={menuOpen ? true : undefined}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

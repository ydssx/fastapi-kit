import { useEffect, useId, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { fetchUsage } from '../api/creator'
import { QuotaDisplay } from '../components/QuotaDisplay'
import { CreatorMark } from '../components/icons/CreatorMark'
import {
  AccountIcon,
  BrandIcon,
  PlaygroundIcon,
  ProjectsIcon,
} from '../components/icons/NavIcons'
import type { Usage } from '../types/api'
import styles from './CreatorLayout.module.css'

type NavAccent = 'accent' | 'ai'

const NAV: {
  to: string
  label: string
  Icon: typeof ProjectsIcon
  accent?: NavAccent
}[] = [
  { to: '/', label: '项目', Icon: ProjectsIcon },
  { to: '/assets', label: '图片素材库', Icon: BrandIcon },
  { to: '/playground', label: '灵感实验室', Icon: PlaygroundIcon, accent: 'ai' },
  { to: '/brand', label: '品牌档案', Icon: BrandIcon },
]

function UserMenu({
  email,
  usage,
  onLogout,
  onNavigate,
}: {
  email: string | undefined
  usage?: Usage
  onLogout: () => void
  onNavigate?: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const accountActive = useLocation().pathname.startsWith('/account')

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className={styles.userMenu} ref={rootRef}>
      <button
        type="button"
        className={styles.userTrigger}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.userAvatar} aria-hidden>
          <AccountIcon />
        </span>
        <span className={styles.email} title={email ?? ''}>
          {email}
        </span>
        <span className={styles.userChevron} aria-hidden>
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open && (
        <div id={menuId} className={styles.userPopover} role="menu" aria-label="账号菜单">
          {usage && (
            <div className={styles.userQuota}>
              <p className={styles.userQuotaLabel}>本月用量</p>
              <QuotaDisplay usage={usage} compact embedded />
            </div>
          )}
          <Link
            to="/account"
            role="menuitem"
            className={accountActive ? styles.userMenuItemActive : styles.userMenuItem}
            aria-current={accountActive ? 'page' : undefined}
            onClick={() => {
              setOpen(false)
              onNavigate?.()
            }}
          >
            账号设置
          </Link>
          <button
            type="button"
            role="menuitem"
            className={styles.userMenuLogout}
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
          >
            退出
          </button>
        </div>
      )}
    </div>
  )
}

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
            <UserMenu email={user?.email} usage={usage} onLogout={logout} onNavigate={closeMenu} />
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
          <div id="creator-mobile-panel" className={styles.mobilePanel}>
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

        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

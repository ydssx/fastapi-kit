import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { fetchUsage } from '../api/creator'
import { QuotaDisplay } from '../components/QuotaDisplay'
import styles from './CreatorLayout.module.css'

const NAV = [
  { to: '/', label: '项目' },
  { to: '/playground', label: '灵感实验室' },
  { to: '/brand', label: '品牌档案' },
  { to: '/account', label: '账号' },
]

export function CreatorLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const { data: usage } = useQuery({ queryKey: ['usage'], queryFn: fetchUsage })

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  function navClass(to: string) {
    const active =
      location.pathname === to ||
      (to === '/' && location.pathname.startsWith('/projects')) ||
      (to === '/playground' && location.pathname.startsWith('/playground'))
    return active ? styles.navActive : undefined
  }

  function closeMenu() {
    setMenuOpen(false)
  }

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

        <button
          type="button"
          className={styles.menuBtn}
          aria-expanded={menuOpen}
          aria-controls="creator-mobile-panel"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? '关闭' : '菜单'}
        </button>

        <nav className={styles.nav} aria-label="主导航">
          {NAV.map((item) => (
            <Link key={item.to} to={item.to} className={navClass(item.to)} onClick={closeMenu}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.meta}>
          {usage && <QuotaDisplay usage={usage} />}
          <span className={styles.email}>{user?.email}</span>
          <button type="button" className={styles.logout} onClick={logout}>
            退出
          </button>
        </div>

        {menuOpen && (
          <div id="creator-mobile-panel" className={styles.mobilePanel}>
            <nav className={styles.mobileNav} aria-label="主导航">
              {NAV.map((item) => (
                <Link key={item.to} to={item.to} className={navClass(item.to)} onClick={closeMenu}>
                  {item.label}
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
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}

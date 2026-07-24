import { useId } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { QuotaDisplay } from './QuotaDisplay'
import { AccountIcon } from './icons/NavIcons'
import { useDismissiblePopover } from '../hooks/useDismissiblePopover'
import type { Usage } from '../types/api'
import styles from '../layouts/CreatorLayout.module.css'

interface UserMenuProps {
  email: string | undefined
  usage?: Usage
  /** Show usage inside menu (mobile). Desktop shows quota in top bar. */
  showQuota?: boolean
  onLogout: () => void
  onNavigate?: () => void
}

export function UserMenu({
  email,
  usage,
  showQuota = false,
  onLogout,
  onNavigate,
}: UserMenuProps) {
  const { open, setOpen, rootRef } = useDismissiblePopover()
  const menuId = useId()
  const accountActive = useLocation().pathname.startsWith('/account')

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
          {showQuota && usage && (
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

import styles from './StatusBadge.module.css'

interface StatusBadgeProps {
  status: string
  variant?: 'ok' | 'warn' | 'error' | 'neutral'
}

const VARIANT_MAP: Record<string, 'ok' | 'warn' | 'error' | 'neutral'> = {
  ok: 'ok',
  online: 'ok',
  active: 'ok',
  error: 'error',
  unavailable: 'error',
  degraded: 'warn',
  offline: 'warn',
  unknown: 'neutral',
}

export function StatusBadge({ status, variant }: StatusBadgeProps) {
  const resolved = variant ?? VARIANT_MAP[status.toLowerCase()] ?? 'neutral'
  return (
    <span className={`${styles.badge} ${styles[resolved]}`}>{status}</span>
  )
}

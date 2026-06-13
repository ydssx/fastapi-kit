import { Link } from 'react-router-dom'
import type { BrandProfile } from '../types/api'
import styles from './ContextChips.module.css'

interface ContextChipsProps {
  brand: BrandProfile
  prevStepTitle?: string
  prevStepSummary?: string
}

function truncate(s: string, max = 24) {
  const t = s.trim()
  return t.length <= max ? t : `${t.slice(0, max)}…`
}

export function ContextChips({ brand, prevStepTitle, prevStepSummary }: ContextChipsProps) {
  const chips: { label: string; to?: string }[] = []
  if (brand.tone.trim()) chips.push({ label: `语气:${truncate(brand.tone, 12)}`, to: '/brand' })
  if (brand.audience.trim()) chips.push({ label: `受众:${truncate(brand.audience, 12)}`, to: '/brand' })
  if (brand.taboos.trim()) chips.push({ label: `禁:${truncate(brand.taboos, 12)}`, to: '/brand' })
  if (prevStepTitle && prevStepSummary?.trim()) {
    chips.push({ label: `上步:${truncate(prevStepSummary, 20)}` })
  }
  if (chips.length === 0) return null

  return (
    <div className={styles.bar} role="list" aria-label="创作上下文">
      {chips.map((c) =>
        c.to ? (
          <Link key={c.label} to={c.to} className={styles.chip} role="listitem">
            {c.label}
          </Link>
        ) : (
          <span key={c.label} className={styles.chip} role="listitem">
            {c.label}
          </span>
        ),
      )}
    </div>
  )
}

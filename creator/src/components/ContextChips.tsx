import { useState } from 'react'
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
  const [expanded, setExpanded] = useState(false)
  const chips: { label: string; to?: string }[] = []
  if (brand.tone.trim()) chips.push({ label: `语气:${truncate(brand.tone, 12)}`, to: '/brand' })
  if (brand.audience.trim()) chips.push({ label: `受众:${truncate(brand.audience, 12)}`, to: '/brand' })
  if (brand.taboos.trim()) chips.push({ label: `禁:${truncate(brand.taboos, 12)}`, to: '/brand' })
  if (prevStepTitle && prevStepSummary?.trim()) {
    chips.push({ label: `上步:${truncate(prevStepSummary, 20)}` })
  }
  if (chips.length === 0) return null

  const summary =
    chips.length === 1
      ? chips[0]!.label
      : `${chips.length} 项上下文 · ${chips[0]!.label}`

  return (
    <div className={styles.wrap}>
      <div className={styles.mobileSummary}>
        <p className={styles.summaryText}>{summary}</p>
        {chips.length > 1 && (
          <button
            type="button"
            className={styles.summaryToggle}
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? '收起' : '展开'}
          </button>
        )}
      </div>
      <div
        className={`${styles.bar} ${expanded ? styles.barExpanded : ''}`}
        role="list"
        aria-label="创作上下文"
      >
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
    </div>
  )
}

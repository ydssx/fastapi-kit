import type { PublishChecklistItem } from '../types/api'
import shared from '../styles/shared.module.css'
import styles from './PublishChecklist.module.css'

interface PublishChecklistProps {
  items: PublishChecklistItem[]
  onToggle: (item: PublishChecklistItem) => void
  onComplete: () => void
  completing: boolean
}

function itemKey(item: PublishChecklistItem) {
  return `${item.platform}:${item.item_key}`
}

export function PublishChecklist({ items, onToggle, onComplete, completing }: PublishChecklistProps) {
  const platforms = new Set(items.map((i) => i.platform))
  const donePlatforms = new Set(
    [...platforms].filter((p) => {
      const pi = items.filter((i) => i.platform === p)
      return pi.length > 0 && pi.every((i) => i.checked)
    }),
  )
  const pending = items.filter((i) => !i.checked).length

  const byPlatform = items.reduce<Record<string, PublishChecklistItem[]>>((acc, item) => {
    acc[item.platform_label] = acc[item.platform_label] ?? []
    acc[item.platform_label].push(item)
    return acc
  }, {})
  const pendingPlatformLabels = Object.entries(byPlatform)
    .filter(([, platformItems]) => platformItems.some((item) => !item.checked))
    .map(([platformLabel, platformItems]) => {
      const count = platformItems.filter((item) => !item.checked).length
      return `${platformLabel}还有 ${count} 项待完成`
    })

  return (
    <section className={shared.panel}>
      <h2 className={shared.panelTitle}>发布核对</h2>
      {platforms.size > 0 && (
        <p className={styles.summary}>
          {donePlatforms.size}/{platforms.size} 平台已核对 · {pending} 项待完成
        </p>
      )}
      <p className={styles.hint}>勾选各平台发布项，全部完成后可结束项目。</p>
      {pending > 0 && (
        <p className={styles.hint} role="status">
          {pendingPlatformLabels.join('；')}
        </p>
      )}
      {Object.entries(byPlatform).map(([platformLabel, platformItems]) => (
        <div key={platformLabel} className={styles.group}>
          <h3 className={styles.groupTitle}>{platformLabel}</h3>
          <ul className={styles.list}>
            {platformItems.map((item) => (
              <li key={itemKey(item)}>
                <label className={styles.item}>
                  <input type="checkbox" checked={item.checked} onChange={() => onToggle(item)} />
                  <span>{item.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className={shared.btnRow}>
        <button
          type="button"
          className={shared.btnPrimary}
          disabled={completing || pending > 0}
          onClick={onComplete}
        >
          {completing ? '提交中…' : '完成项目'}
        </button>
      </div>
    </section>
  )
}

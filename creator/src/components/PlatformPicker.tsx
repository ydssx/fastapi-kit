import styles from './PlatformPicker.module.css'

interface PlatformOption {
  key: string
  label: string
  emoji?: string
}

interface PlatformPickerProps {
  options: PlatformOption[]
  value: string[]
  onChange: (keys: string[]) => void
  legend?: string
  primaryKey?: string | null
  onPrimaryChange?: (key: string) => void
  showPrimary?: boolean
}

export function PlatformPicker({
  options,
  value,
  onChange,
  legend = '目标平台',
  primaryKey = null,
  onPrimaryChange,
  showPrimary = false,
}: PlatformPickerProps) {
  function toggle(key: string) {
    if (value.includes(key)) {
      const next = value.filter((p) => p !== key)
      onChange(next)
      if (showPrimary && onPrimaryChange && primaryKey === key) {
        onPrimaryChange(next.length === 1 ? next[0]! : '')
      }
      return
    }
    onChange([...value, key])
  }

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.pills}>
        {options.map((p) => {
          const active = value.includes(p.key)
          return (
            <button
              key={p.key}
              type="button"
              className={`${styles.pill} ${active ? styles.active : ''}`}
              onClick={() => toggle(p.key)}
              aria-pressed={active}
            >
              {p.emoji && <span className={styles.emoji}>{p.emoji}</span>}
              {p.label}
              {active && (
                <span className={styles.check} aria-hidden>
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>
      {showPrimary && value.length > 1 && onPrimaryChange && (
        <div className={styles.primaryRow} role="radiogroup" aria-label="主平台">
          <span className={styles.primaryLabel}>主平台（AI 写作风格）</span>
          <div className={styles.primaryOptions}>
            {value.map((key) => {
              const opt = options.find((o) => o.key === key)
              if (!opt) return null
              const selected = primaryKey === key
              return (
                <label key={key} className={styles.primaryOption}>
                  <input
                    type="radio"
                    name="primary-platform"
                    value={key}
                    checked={selected}
                    onChange={() => onPrimaryChange(key)}
                  />
                  <span>{opt.label}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </fieldset>
  )
}

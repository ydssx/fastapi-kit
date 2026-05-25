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
}

export function PlatformPicker({ options, value, onChange, legend = '目标平台' }: PlatformPickerProps) {
  function toggle(key: string) {
    onChange(value.includes(key) ? value.filter((p) => p !== key) : [...value, key])
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
    </fieldset>
  )
}

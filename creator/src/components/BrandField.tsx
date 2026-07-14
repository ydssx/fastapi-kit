import shared from '../styles/shared.module.css'
import styles from './BrandField.module.css'

const MAX_LEN = 300

interface BrandFieldProps {
  label: string
  hint: string
  value: string
  rows?: number
  onChange: (value: string) => void
}

export function BrandField({ label, hint, value, rows = 3, onChange }: BrandFieldProps) {
  return (
    <label className={`${shared.fieldLabel} ${styles.field}`}>
      <div className={styles.head}>
        <span>{label}</span>
        <span className={styles.count}>
          {value.length}/{MAX_LEN}
        </span>
      </div>
      <span className={styles.hint}>{hint}</span>
      <textarea
        className={shared.textarea}
        rows={rows}
        maxLength={MAX_LEN}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

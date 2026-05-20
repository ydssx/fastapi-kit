import type { ReactNode } from 'react'
import styles from './DetailMeta.module.css'

export type DetailMetaItem = {
  label: string
  value: ReactNode
}

type DetailMetaProps = {
  items: DetailMetaItem[]
}

export function DetailMeta({ items }: DetailMetaProps) {
  return (
    <dl className={styles.meta}>
      {items.map((item) => (
        <div key={item.label} className={styles.row}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

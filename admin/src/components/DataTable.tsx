import type { ReactNode } from 'react'
import styles from './DataTable.module.css'

/** Default max height for scrollable list tables (sticky header). */
export const TABLE_SCROLL_MAX_HEIGHT = 'min(52vh, 24rem)' as const

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  mono?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  emptyMessage?: string
  /** Cap table body height; header stays sticky while scrolling rows. */
  scrollMaxHeight?: string
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = '暂无数据',
  scrollMaxHeight,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>
  }

  return (
    <div
      className={scrollMaxHeight ? `${styles.wrap} ${styles.wrapScroll}` : styles.wrap}
      style={scrollMaxHeight ? { maxHeight: scrollMaxHeight } : undefined}
    >
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((col) => (
                <td key={col.key} className={col.mono ? styles.mono : undefined}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

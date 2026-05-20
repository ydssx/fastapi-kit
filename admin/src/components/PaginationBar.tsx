import shared from '../styles/shared.module.css'

type PaginationBarProps = {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

export function PaginationBar({ page, totalPages, total, onPageChange }: PaginationBarProps) {
  return (
    <div className={shared.pagination}>
      <span className={shared.paginationTotal}>共 {total} 条</span>
      <div className={shared.paginationControls}>
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          上一页
        </button>
        <span>
          第 {page} / {totalPages} 页
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          下一页
        </button>
      </div>
    </div>
  )
}

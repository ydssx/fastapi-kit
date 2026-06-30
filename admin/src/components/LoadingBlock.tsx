import shared from '../styles/shared.module.css'

interface LoadingBlockProps {
  label?: string
}

export function LoadingBlock({ label = '加载中…' }: LoadingBlockProps) {
  return (
    <div className={shared.loadingPanel} role="status" aria-live="polite">
      <span className={shared.spinner} aria-hidden />
      {label}
    </div>
  )
}

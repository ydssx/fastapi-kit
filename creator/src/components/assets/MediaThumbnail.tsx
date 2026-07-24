import { useMediaPreview } from '../../hooks/useMediaPreview'
import type { MediaAsset } from '../../types/api'
import styles from './MediaThumbnail.module.css'

interface MediaThumbnailProps {
  asset: MediaAsset
  className?: string
  placeholderClassName?: string
  alt?: string
}

export function MediaThumbnail({
  asset,
  className,
  placeholderClassName,
  alt,
}: MediaThumbnailProps) {
  const { data, isLoading, isError } = useMediaPreview(asset)
  const placeholder = placeholderClassName ?? styles.placeholder

  if (asset.status !== 'ready') {
    return (
      <div className={placeholder}>{asset.status === 'failed' ? '生成失败' : '处理中'}</div>
    )
  }
  if (isLoading) return <div className={placeholder}>加载预览…</div>
  if (isError || !data) return <div className={placeholder}>预览不可用</div>

  return (
    <img
      className={className ?? styles.image}
      src={data.url}
      alt={alt ?? `素材：${asset.original_filename}`}
    />
  )
}

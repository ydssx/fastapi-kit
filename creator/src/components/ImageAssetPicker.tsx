import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { fetchMedia } from '../api/creator'
import type { MediaAsset } from '../types/api'
import { MediaThumbnail } from './assets/MediaThumbnail'
import { LoadingBlock } from './LoadingBlock'
import shared from '../styles/shared.module.css'
import styles from './ImageAssetPicker.module.css'

interface ImageAssetPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (asset: MediaAsset) => void
  selecting?: boolean
}

export function ImageAssetPicker({ open, onClose, onSelect, selecting = false }: ImageAssetPickerProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [keyword, setKeyword] = useState('')
  const [submittedKeyword, setSubmittedKeyword] = useState('')
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['media-assets', 'picker', submittedKeyword],
    queryFn: () => fetchMedia({ keyword: submittedKeyword || undefined }),
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    dialogRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open) return null

  return (
    <div className={styles.backdrop} onMouseDown={onClose} role="presentation">
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-asset-picker-title"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>图片素材库</p>
            <h2 id="image-asset-picker-title">从素材库添加图片</h2>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="关闭素材选择器">
            ×
          </button>
        </div>
        <form
          className={styles.search}
          onSubmit={(event) => {
            event.preventDefault()
            setSubmittedKeyword(keyword.trim())
          }}
        >
          <label className={shared.fieldLabel}>
            搜索图片素材
            <input
              className={shared.input}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="按文件名、分类或标签搜索"
            />
          </label>
          <button type="submit" className={shared.btnGhost}>搜索</button>
        </form>
        <div className={styles.results} aria-live="polite">
          {isLoading && <LoadingBlock label="加载图片素材…" />}
          {isError && <p className={shared.error}>{error instanceof Error ? error.message : '加载素材失败'}</p>}
          {!isLoading && !isError && data?.items.length === 0 && <p className={shared.muted}>没有找到可用的图片素材。</p>}
          {data?.items.map((asset) => (
            <article key={asset.id} className={styles.asset}>
              <MediaThumbnail
                asset={asset}
                className={styles.previewImage}
                placeholderClassName={styles.previewPlaceholder}
                alt=""
              />
              <div className={styles.assetInfo}>
                <strong>{asset.original_filename}</strong>
                <span>{asset.category} · {asset.tags.join('、') || '未标记'}</span>
              </div>
              <button
                type="button"
                className={shared.btnPrimary}
                onClick={() => onSelect(asset)}
                disabled={asset.status !== 'ready' || selecting}
              >
                {asset.status !== 'ready' ? '暂不可用' : selecting ? '添加中…' : '添加'}
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}

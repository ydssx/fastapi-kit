import { useEffect, useRef, type FormEvent } from 'react'
import type { MediaAsset } from '../../types/api'
import shared from '../../styles/shared.module.css'
import pageStyles from '../../pages/AssetLibraryPage.module.css'
import { MediaThumbnail } from './MediaThumbnail'
import { formatBytes, SOURCE_BADGE_LABELS } from './mediaUtils'

interface AssetLightboxProps {
  asset: MediaAsset
  editFilename: string
  onEditFilenameChange: (value: string) => void
  editCategory: string
  onEditCategoryChange: (value: string) => void
  editTags: string
  onEditTagsChange: (value: string) => void
  onClose: () => void
  onUpdate: (event: FormEvent<HTMLFormElement>) => void
  onDelete: () => void
  updatePending: boolean
  deletePending: boolean
  updateError: Error | null
  deleteError: Error | null
}

export function AssetLightbox({
  asset,
  editFilename,
  onEditFilenameChange,
  editCategory,
  onEditCategoryChange,
  editTags,
  onEditTagsChange,
  onClose,
  onUpdate,
  onDelete,
  updatePending,
  deletePending,
  updateError,
  deleteError,
}: AssetLightboxProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const titleId = 'asset-lightbox-title'
  const sourceLabel = SOURCE_BADGE_LABELS[asset.source] ?? asset.source

  // Mount-once: parent often passes an unstable onClose; re-running would steal input caret.
  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialogRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        onCloseRef.current()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      previouslyFocused?.focus()
    }
  }, [])

  return (
    <div className={pageStyles.lightbox} onMouseDown={onClose} role="presentation">
      <section
        ref={dialogRef}
        className={pageStyles.lightboxDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={pageStyles.detailHeader}>
          <div>
            <p className={pageStyles.kicker}>素材详情 · {sourceLabel}</p>
            <h2 id={titleId} className={shared.panelTitle}>
              编辑图片信息
            </h2>
          </div>
          <button
            type="button"
            className={pageStyles.closeButton}
            onClick={onClose}
            aria-label="关闭编辑"
          >
            ×
          </button>
        </div>
        <div className={pageStyles.detailContent}>
          <div className={pageStyles.detailPreview}>
            <MediaThumbnail
              asset={asset}
              className={pageStyles.thumbnail}
              placeholderClassName={pageStyles.thumbnailPlaceholder}
            />
          </div>
          <form className={pageStyles.editForm} onSubmit={onUpdate}>
            <label className={shared.fieldLabel}>
              文件名
              <input
                className={shared.input}
                value={editFilename}
                onChange={(event) => onEditFilenameChange(event.target.value)}
              />
            </label>
            <label className={shared.fieldLabel}>
              分类
              <input
                className={shared.input}
                value={editCategory}
                onChange={(event) => onEditCategoryChange(event.target.value)}
              />
            </label>
            <label className={shared.fieldLabel}>
              标签
              <input
                className={shared.input}
                value={editTags}
                onChange={(event) => onEditTagsChange(event.target.value)}
              />
            </label>
            <p className={pageStyles.assetMeta}>
              {sourceLabel} · {asset.mime_type} · {formatBytes(asset.byte_size)}
              <br />
              {asset.width ?? '?'} × {asset.height ?? '?'}
            </p>
            {updateError && <p className={shared.error}>{updateError.message}</p>}
            <div className={shared.btnRow}>
              <button
                type="submit"
                className={shared.btnPrimary}
                disabled={updatePending || !editFilename.trim() || !editCategory.trim()}
              >
                {updatePending ? '保存中…' : '保存信息'}
              </button>
              <button
                type="button"
                className={shared.btnDanger}
                onClick={onDelete}
                disabled={deletePending}
              >
                {deletePending ? '删除中…' : '删除素材'}
              </button>
            </div>
            {deleteError && <p className={shared.error}>{deleteError.message}</p>}
          </form>
        </div>
      </section>
    </div>
  )
}

import { EmptyState } from '../EmptyState'
import { LoadingBlock } from '../LoadingBlock'
import type { MediaAsset } from '../../types/api'
import shared from '../../styles/shared.module.css'
import pageStyles from '../../pages/AssetLibraryPage.module.css'
import { MediaThumbnail } from './MediaThumbnail'
import { SOURCE_BADGE_LABELS } from './mediaUtils'

interface AssetGridProps {
  loading: boolean
  error: Error | null
  items: MediaAsset[]
  onOpen: (asset: MediaAsset) => void
  onEmptyUpload: () => void
  onEmptyGenerate: () => void
}

function badgeClass(source: string): string {
  if (source === 'url_import') return pageStyles.sourceBadgeImport
  if (source === 'generation') return pageStyles.sourceBadgeAi
  return ''
}

export function AssetGrid({
  loading,
  error,
  items,
  onOpen,
  onEmptyUpload,
  onEmptyGenerate,
}: AssetGridProps) {
  return (
    <section className={pageStyles.library} aria-live="polite">
      <div className={pageStyles.sheetHeader}>
        <div>
          <p className={pageStyles.sheetKicker}>素材一览</p>
          <h2 className={pageStyles.sheetTitle}>素材台</h2>
        </div>
      </div>

      <div className={pageStyles.sheet}>
        {loading && <LoadingBlock label="加载图片素材…" />}
        {error && <p className={shared.error}>{error.message}</p>}
        {!loading && !error && items.length === 0 && (
          <div className={pageStyles.emptySheet}>
            <EmptyState
              title="还没有图片素材"
              description="上传一张图片、导入可信链接，或让 AI 为你生成第一张素材。"
            >
              <div className={shared.btnRow}>
                <button type="button" className={shared.btnPrimary} onClick={onEmptyUpload}>
                  上传图片
                </button>
                <button type="button" className={pageStyles.aiButton} onClick={onEmptyGenerate}>
                  AI 生成
                </button>
              </div>
            </EmptyState>
          </div>
        )}
        {items.length > 0 && (
          <div className={pageStyles.grid}>
            {items.map((asset) => {
              const label = SOURCE_BADGE_LABELS[asset.source] ?? asset.source
              return (
                <article key={asset.id} className={pageStyles.assetCard}>
                  <button
                    type="button"
                    className={pageStyles.assetOpen}
                    onClick={() => onOpen(asset)}
                    aria-label={`查看素材：${asset.original_filename}`}
                  >
                    <div className={pageStyles.frame}>
                      <span className={`${pageStyles.sourceBadge} ${badgeClass(asset.source)}`.trim()}>
                        {label}
                      </span>
                      <MediaThumbnail
                        asset={asset}
                        className={pageStyles.thumbnail}
                        placeholderClassName={pageStyles.thumbnailPlaceholder}
                      />
                      <span className={pageStyles.assetMetaOverlay}>
                        <span className={pageStyles.assetName}>{asset.original_filename}</span>
                        <span className={pageStyles.assetCategory}>{asset.category}</span>
                      </span>
                    </div>
                  </button>
                  {asset.tags.length > 0 && (
                    <div className={pageStyles.tagList}>
                      {asset.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

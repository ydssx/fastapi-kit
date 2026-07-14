import { useMediaPreview } from '../hooks/useMediaPreview'
import type { MediaAsset, MediaAssociation } from '../types/api'
import shared from '../styles/shared.module.css'
import styles from './ImageAssetPreview.module.css'

export interface UsedImageAsset {
  asset: MediaAsset
  association: MediaAssociation
}

interface ImageAssetPreviewProps {
  assets: UsedImageAsset[]
  currentStepKey?: string
  onRemove?: (item: UsedImageAsset) => void
  removingAssociationId?: string | null
}

function UsedAssetImage({ asset }: { asset: MediaAsset }) {
  const { data, isError } = useMediaPreview(asset)

  if (asset.status !== 'ready' || isError || !data) {
    return <div className={styles.invalidPreview} role="status">素材已失效</div>
  }
  return <img className={styles.image} src={data.url} alt={`已用素材：${asset.original_filename}`} />
}

export function ImageAssetPreview({
  assets,
  currentStepKey,
  onRemove,
  removingAssociationId = null,
}: ImageAssetPreviewProps) {
  const visibleAssets = currentStepKey
    ? assets.filter((item) => item.association.step_key === currentStepKey)
    : assets

  if (visibleAssets.length === 0) return null

  return (
    <section className={styles.section} aria-labelledby="used-image-assets-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.kicker}>项目素材</p>
          <h2 id="used-image-assets-title">本步骤已用图片</h2>
        </div>
        <span>{visibleAssets.length} 项</span>
      </div>
      <ul className={styles.list}>
        {visibleAssets.map((item) => (
          <li key={item.association.id} className={styles.asset}>
            <UsedAssetImage asset={item.asset} />
            <div className={styles.info}>
              <strong>{item.asset.original_filename}</strong>
              <code>{item.association.asset_reference}</code>
              {item.asset.status !== 'ready' && (
                <p className={styles.invalidNotice}>素材已失效，历史正文中的引用保持不变。</p>
              )}
            </div>
            {onRemove && (
              <button
                type="button"
                className={shared.btnGhost}
                onClick={() => onRemove(item)}
                disabled={removingAssociationId === item.association.id}
              >
                {removingAssociationId === item.association.id ? '解除中…' : '解除关联'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

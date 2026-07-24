import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CompletedBanner } from '../../components/CompletedBanner'
import {
  ImageAssetPreview,
  type UsedImageAsset,
} from '../../components/ImageAssetPreview'
import { StepVersionHistory } from '../../components/StepVersionHistory'
import type { Project } from '../../types/api'
import shared from '../../styles/shared.module.css'
import styles from '../ProjectDetailPage.module.css'

interface ProjectCompletedViewProps {
  project: Project
  editTitle: string
  setEditTitle: (value: string) => void
  onSaveTitle: () => void
  usedImageAssets: UsedImageAsset[]
  onRemoveAsset: (item: UsedImageAsset) => void
  removingAssociationId: string | null
  stepTitle: (key: string) => string
  actionError: string | null
  moreMenu: ReactNode
  dialog: ReactNode
}

export function ProjectCompletedView({
  project,
  editTitle,
  setEditTitle,
  onSaveTitle,
  usedImageAssets,
  onRemoveAsset,
  removingAssociationId,
  stepTitle,
  actionError,
  moreMenu,
  dialog,
}: ProjectCompletedViewProps) {
  return (
    <div className={`${shared.page} ${styles.page}`}>
      {dialog}
      <header className={styles.heroCompact}>
        <div className={styles.heroChrome}>
          <Link to="/" className={shared.backLink}>
            ← 返回列表
          </Link>
          {moreMenu}
        </div>
      </header>
      <CompletedBanner title={project.title} />
      <section className={styles.metaEdit}>
        <label className={shared.fieldLabel}>
          项目标题
          <input
            className={shared.input}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={onSaveTitle}
          />
        </label>
      </section>
      <ImageAssetPreview
        assets={usedImageAssets}
        currentStepKey={project.current_step_key}
        onRemove={onRemoveAsset}
        removingAssociationId={removingAssociationId}
      />
      <StepVersionHistory artifacts={project.artifacts} stepTitle={stepTitle} />
      {actionError && <p className={shared.error}>{actionError}</p>}
    </div>
  )
}

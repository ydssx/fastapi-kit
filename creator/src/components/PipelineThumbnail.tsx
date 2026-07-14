import styles from './PipelineThumbnail.module.css'

interface PipelineThumbnailProps {
  pipelineId: string
  className?: string
  size?: 'md' | 'lg'
}

export function PipelineThumbnail({
  pipelineId,
  className,
  size = 'md',
}: PipelineThumbnailProps) {
  const isVideo = pipelineId === 'short_video'
  return (
    <div
      className={`${styles.thumb} ${isVideo ? styles.video : styles.article} ${size === 'lg' ? styles.lg : ''} ${className ?? ''}`}
      aria-hidden
    >
      {isVideo ? (
        <>
          <span className={styles.rack} />
          <span className={styles.garment} />
          <span className={styles.plant} />
        </>
      ) : (
        <span className={styles.glyph}>¶</span>
      )}
    </div>
  )
}

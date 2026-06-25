import type { PlaygroundTopic } from '../types/api'
import shared from '../styles/shared.module.css'
import styles from './PlaygroundTopicCards.module.css'

interface PlaygroundTopicCardsProps {
  topics: PlaygroundTopic[]
  selected: PlaygroundTopic | null
  onSelect: (topic: PlaygroundTopic) => void
}

export function PlaygroundTopicCards({ topics, selected, onSelect }: PlaygroundTopicCardsProps) {
  return (
    <div className={styles.grid}>
      {topics.map((topic) => {
        const active =
          selected?.title === topic.title && selected?.reason === topic.reason
        return (
          <button
            key={`${topic.title}-${topic.reason}`}
            type="button"
            className={`${styles.card} ${active ? styles.active : ''}`}
            onClick={() => onSelect(topic)}
          >
            <h3 className={styles.title}>{topic.title}</h3>
            <p className={styles.reason}>{topic.reason}</p>
            {active ? <span className={styles.badge}>已选</span> : null}
          </button>
        )
      })}
    </div>
  )
}

export function PlaygroundTopicCardsActions({
  onRegenerate,
  loading,
}: {
  onRegenerate: () => void
  loading: boolean
}) {
  return (
    <div className={shared.btnRow}>
      <button type="button" className={shared.btnGhost} onClick={onRegenerate} disabled={loading}>
        换一批选题
      </button>
    </div>
  )
}

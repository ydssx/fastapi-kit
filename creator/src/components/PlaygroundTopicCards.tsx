import type { PlaygroundTopic } from '../types/api'
import { samePlaygroundTopic, topicInList } from '../lib/playgroundTopics'
import shared from '../styles/shared.module.css'
import styles from './PlaygroundTopicCards.module.css'

interface PlaygroundTopicCardsProps {
  topics: PlaygroundTopic[]
  selected: PlaygroundTopic | null
  selectedTopics?: PlaygroundTopic[]
  onSelect: (topic: PlaygroundTopic) => void
  onToggleSlate?: (topic: PlaygroundTopic) => void
}

export function PlaygroundTopicCards({
  topics,
  selected,
  selectedTopics = [],
  onSelect,
  onToggleSlate,
}: PlaygroundTopicCardsProps) {
  const slateEnabled = typeof onToggleSlate === 'function'
  return (
    <div className={styles.grid}>
      {topics.map((topic) => {
        const active =
          selected != null && samePlaygroundTopic(selected, topic)
        const inSlate = topicInList(selectedTopics, topic)
        return (
          <div
            key={`${topic.title}-${topic.reason}`}
            className={`${styles.card} ${active ? styles.active : ''} ${
              inSlate && !active ? styles.inSlate : ''
            }`}
          >
            {slateEnabled ? (
              <label className={styles.slateCheck} onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={inSlate}
                  onChange={() => onToggleSlate(topic)}
                  aria-label={`将「${topic.title}」加入交接清单`}
                />
              </label>
            ) : null}
            <button
              type="button"
              className={styles.cardBody}
              onClick={() => onSelect(topic)}
            >
              <h3 className={styles.title}>{topic.title}</h3>
              <p className={styles.reason}>{topic.reason}</p>
              {active ? <span className={styles.badge}>{slateEnabled ? '焦点' : '已选'}</span> : null}
              {!active && inSlate ? <span className={styles.slateBadge}>待交接</span> : null}
            </button>
          </div>
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

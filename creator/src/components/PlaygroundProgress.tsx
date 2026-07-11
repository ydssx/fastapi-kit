import styles from './PlaygroundProgress.module.css'

export type PlaygroundStage = 'topics' | 'refine' | 'outline'

const STAGES: { key: PlaygroundStage; label: string }[] = [
  { key: 'topics', label: '选题' },
  { key: 'refine', label: '打磨' },
  { key: 'outline', label: '大纲' },
]

interface PlaygroundProgressProps {
  current: PlaygroundStage
  completed: PlaygroundStage[]
}

export function PlaygroundProgress({ current, completed }: PlaygroundProgressProps) {
  return (
    <nav className={styles.progress} aria-label="灵感实验室进度">
      <ol className={styles.list}>
        {STAGES.map((stage, index) => {
          const done = completed.includes(stage.key)
          const active = current === stage.key
          return (
            <li
              key={stage.key}
              className={[
                styles.item,
                active ? styles.active : '',
                done && !active ? styles.done : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={active ? 'step' : undefined}
            >
              <span className={styles.index} aria-hidden>
                {done && !active ? '✓' : String(index + 1).padStart(2, '0')}
              </span>
              <span className={styles.label}>{stage.label}</span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function resolvePlaygroundStage(input: {
  hasTopics: boolean
  hasSelectedTopic: boolean
  outlineOpen: boolean
}): { current: PlaygroundStage; completed: PlaygroundStage[] } {
  const completed: PlaygroundStage[] = []
  if (input.hasSelectedTopic) completed.push('topics')
  if (input.outlineOpen) completed.push('refine')

  if (!input.hasTopics) {
    return { current: 'topics', completed }
  }
  if (!input.hasSelectedTopic) {
    return { current: 'topics', completed }
  }
  if (input.outlineOpen) {
    return { current: 'outline', completed }
  }
  return { current: 'refine', completed }
}

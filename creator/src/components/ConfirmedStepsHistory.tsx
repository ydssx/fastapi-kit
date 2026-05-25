import type { StepArtifact } from '../types/api'
import shared from '../styles/shared.module.css'
import styles from './ConfirmedStepsHistory.module.css'

interface ConfirmedStepsHistoryProps {
  artifacts: StepArtifact[]
  stepTitle: (stepKey: string) => string
}

export function ConfirmedStepsHistory({ artifacts, stepTitle }: ConfirmedStepsHistoryProps) {
  if (artifacts.length === 0) return null

  return (
    <section className={styles.history}>
      <h2 className={shared.panelTitle}>已确认步骤</h2>
      <ul className={styles.list}>
        {artifacts.map((a) => (
          <li key={`${a.step_key}-${a.version}`} className={styles.item}>
            <div className={styles.head}>
              <strong>{stepTitle(a.step_key)}</strong>
              <span>v{a.version}</span>
            </div>
            <p>
              {a.content.slice(0, 200)}
              {a.content.length > 200 ? '…' : ''}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

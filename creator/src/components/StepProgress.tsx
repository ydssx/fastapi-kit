import type { PipelineStep } from '../types/api'
import styles from './StepProgress.module.css'

interface StepProgressProps {
  steps: PipelineStep[]
  currentStepKey: string
}

export function StepProgress({ steps, currentStepKey }: StepProgressProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStepKey)

  return (
    <ol className={styles.track} aria-label="流水线进度">
      {steps.map((step, index) => {
        const done = currentIndex > index
        const active = step.key === currentStepKey
        return (
          <li
            key={step.key}
            className={`${styles.step} ${done ? styles.done : ''} ${active ? styles.active : ''}`}
            aria-current={active ? 'step' : undefined}
          >
            <span className={styles.dot}>{done ? '✓' : index + 1}</span>
            <span className={styles.label}>{step.title}</span>
          </li>
        )
      })}
    </ol>
  )
}

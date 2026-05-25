import type { PipelineStep } from '../types/api'
import styles from './StepProgress.module.css'

interface StepProgressProps {
  steps: PipelineStep[]
  currentStepKey: string
  onStepOpen?: (stepKey: string) => void
  openingStepKey?: string | null
}

export function StepProgress({
  steps,
  currentStepKey,
  onStepOpen,
  openingStepKey,
}: StepProgressProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStepKey)

  return (
    <ol className={styles.track} aria-label="流水线进度">
      {steps.map((step, index) => {
        const done = currentIndex > index
        const active = step.key === currentStepKey
        const canOpen = done && onStepOpen && step.key !== 'publish'
        return (
          <li
            key={step.key}
            className={`${styles.step} ${done ? styles.done : ''} ${active ? styles.active : ''} ${canOpen ? styles.clickable : ''}`}
            aria-current={active ? 'step' : undefined}
          >
            {canOpen ? (
              <button
                type="button"
                className={styles.stepButton}
                onClick={() => onStepOpen(step.key)}
                disabled={openingStepKey === step.key}
                title={`回到「${step.title}」编辑`}
              >
                <span className={styles.dot}>{done ? '✓' : index + 1}</span>
                <span className={styles.label}>{step.title}</span>
              </button>
            ) : (
              <>
                <span className={styles.dot}>{done ? '✓' : index + 1}</span>
                <span className={styles.label}>{step.title}</span>
              </>
            )}
          </li>
        )
      })}
    </ol>
  )
}

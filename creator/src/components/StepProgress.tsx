import type { PipelineStep } from '../types/api'
import { CheckIcon, StepIcon } from './icons/StepIcons'
import styles from './StepProgress.module.css'

interface StepProgressProps {
  steps: PipelineStep[]
  currentStepKey: string
  onStepOpen?: (stepKey: string) => void
  openingStepKey?: string | null
}

function StepDot({ done, stepKey, index }: { done: boolean; stepKey: string; index: number }) {
  if (done) {
    return (
      <span className={styles.dot}>
        <CheckIcon size={14} />
      </span>
    )
  }
  return (
    <span className={styles.dot}>
      <StepIcon stepKey={stepKey} size={14} />
      <span className="sr-only">步骤 {index + 1}</span>
    </span>
  )
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
        const dot = <StepDot done={done} stepKey={step.key} index={index} />

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
                {dot}
                <span className={styles.label}>{step.title}</span>
              </button>
            ) : (
              <>
                {dot}
                <span className={styles.label}>{step.title}</span>
              </>
            )}
          </li>
        )
      })}
    </ol>
  )
}

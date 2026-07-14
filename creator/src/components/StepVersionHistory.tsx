import type { StepArtifact } from '../types/api'
import { formatProjectDate } from '../lib/format'
import shared from '../styles/shared.module.css'
import styles from './StepVersionHistory.module.css'

interface StepVersionHistoryProps {
  artifacts: StepArtifact[]
  stepTitle: (stepKey: string) => string
}

async function copyContent(content: string) {
  await navigator.clipboard.writeText(content)
}

export function StepVersionHistory({ artifacts, stepTitle }: StepVersionHistoryProps) {
  if (artifacts.length === 0) return null

  const byStep = new Map<string, StepArtifact[]>()
  for (const artifact of artifacts) {
    const group = byStep.get(artifact.step_key) ?? []
    group.push(artifact)
    byStep.set(artifact.step_key, group)
  }

  return (
    <section className={styles.history}>
      <h2 className={shared.panelTitle}>版本历史</h2>
      <div className={styles.groups}>
        {[...byStep.entries()].map(([stepKey, versions]) => (
          <div key={stepKey} className={styles.group}>
            <h3 className={styles.groupTitle}>{stepTitle(stepKey)}</h3>
            <ul className={styles.list}>
              {[...versions]
                .sort((a, b) => b.version - a.version)
                .map((artifact) => {
                  const latestVersion = Math.max(...versions.map((v) => v.version))
                  return (
                    <li key={`${artifact.step_key}-${artifact.version}`}>
                      <details className={styles.item}>
                        <summary className={styles.summary}>
                          <span>
                            版本 {artifact.version}
                            {artifact.version === latestVersion ? ' · 最新' : ''}
                          </span>
                          <time dateTime={artifact.confirmed_at}>
                            {formatProjectDate(artifact.confirmed_at)}
                          </time>
                        </summary>
                        <div className={styles.contentWrap}>
                          <pre className={styles.content}>{artifact.content}</pre>
                          <button
                            type="button"
                            className={shared.btnGhost}
                            onClick={() => void copyContent(artifact.content)}
                          >
                            复制
                          </button>
                        </div>
                      </details>
                    </li>
                  )
                })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

import {
  cloneElement,
  isValidElement,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import styles from './StepWorkspace.module.css'

interface StepWorkspaceProps {
  editor: ReactNode
  aiPanel: ReactNode
}

type AiPanelProps = {
  mobileCollapsed?: boolean
  onToggleMobile?: () => void
}

export function StepWorkspace({ editor, aiPanel }: StepWorkspaceProps) {
  const [aiOpen, setAiOpen] = useState(false)
  const [isWide, setIsWide] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 900px)').matches
      : true,
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)')
    const onChange = (e: MediaQueryListEvent) => {
      setIsWide(e.matches)
      if (e.matches) setAiOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const mobileCollapsed = !isWide && !aiOpen

  const renderedAiPanel =
    !isWide && isValidElement(aiPanel)
      ? cloneElement(aiPanel as ReactElement<AiPanelProps>, {
          mobileCollapsed,
          onToggleMobile: () => setAiOpen((v) => !v),
        })
      : aiPanel

  return (
    <div id="creator-step-workspace" className={styles.workspace}>
      <div className={styles.editorCol}>{editor}</div>
      <div className={styles.aiCol}>{renderedAiPanel}</div>
    </div>
  )
}

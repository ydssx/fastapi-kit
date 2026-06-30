import { useCallback, useEffect, useState } from 'react'
import type { PlaygroundMessage, PlaygroundOutline, PlaygroundTopic } from '../types/api'

const STORAGE_KEY = 'creator-playground-session'

export interface PlaygroundSession {
  topics: PlaygroundTopic[]
  selectedTopic: PlaygroundTopic | null
  messages: PlaygroundMessage[]
  understanding: string | null
  brandEmpty: boolean
  outline: PlaygroundOutline | null
  outlineMessages: PlaygroundMessage[]
}

const EMPTY: PlaygroundSession = {
  topics: [],
  selectedTopic: null,
  messages: [],
  understanding: null,
  brandEmpty: false,
  outline: null,
  outlineMessages: [],
}

function loadSession(): PlaygroundSession {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    return { ...EMPTY, ...JSON.parse(raw) } as PlaygroundSession
  } catch {
    return EMPTY
  }
}

export function usePlaygroundSession() {
  const [session, setSession] = useState<PlaygroundSession>(loadSession)

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  }, [session])

  const resetSession = useCallback(() => {
    setSession(EMPTY)
    sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  const exportSession = useCallback(() => {
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'playground-session.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [session])

  return { session, setSession, resetSession, exportSession }
}

import { useCallback, useEffect, useState } from 'react'
import type { PlaygroundMessage, PlaygroundOutline, PlaygroundTopic } from '../types/api'
import { topicInList } from '../lib/playgroundTopics'

const STORAGE_KEY = 'creator-playground-session'

export interface PlaygroundSession {
  topics: PlaygroundTopic[]
  selectedTopic: PlaygroundTopic | null
  selectedTopics: PlaygroundTopic[]
  messages: PlaygroundMessage[]
  understanding: string | null
  brandEmpty: boolean
  outline: PlaygroundOutline | null
  outlineMessages: PlaygroundMessage[]
}

const EMPTY: PlaygroundSession = {
  topics: [],
  selectedTopic: null,
  selectedTopics: [],
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
    const parsed = { ...EMPTY, ...JSON.parse(raw) } as PlaygroundSession
    // Migrate sessions saved before multi-select existed.
    if (!Array.isArray(parsed.selectedTopics)) {
      parsed.selectedTopics = parsed.selectedTopic ? [parsed.selectedTopic] : []
    } else if (
      parsed.selectedTopic &&
      !topicInList(parsed.selectedTopics, parsed.selectedTopic)
    ) {
      parsed.selectedTopics = [...parsed.selectedTopics, parsed.selectedTopic]
    }
    return parsed
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

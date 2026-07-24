import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import type { PlaygroundTopic } from '../types/api'
import { usePlaygroundActions } from './usePlaygroundActions'
import type { PlaygroundSession } from './usePlaygroundSession'

const playgroundTopics = vi.fn()
const playgroundHandoff = vi.fn()
const playgroundRefine = vi.fn()
const playgroundOutlineGenerate = vi.fn()
const playgroundOutlineRefine = vi.fn()
const navigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock('../api/creator', () => ({
  playgroundTopics: (...args: unknown[]) => playgroundTopics(...args),
  playgroundHandoff: (...args: unknown[]) => playgroundHandoff(...args),
  playgroundRefine: (...args: unknown[]) => playgroundRefine(...args),
  playgroundOutlineGenerate: (...args: unknown[]) => playgroundOutlineGenerate(...args),
  playgroundOutlineRefine: (...args: unknown[]) => playgroundOutlineRefine(...args),
}))

const topicA: PlaygroundTopic = {
  title: '选题 A',
  reason: '理由 A',
}
const topicB: PlaygroundTopic = {
  title: '选题 B',
  reason: '理由 B',
}

function emptySession(overrides: Partial<PlaygroundSession> = {}): PlaygroundSession {
  return {
    topics: [topicA, topicB],
    selectedTopic: topicA,
    selectedTopics: [topicA, topicB],
    messages: [],
    understanding: null,
    brandEmpty: false,
    outline: null,
    outlineMessages: [],
    ...overrides,
  }
}

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
}

describe('usePlaygroundActions', () => {
  beforeEach(() => {
    playgroundTopics.mockReset()
    playgroundHandoff.mockReset()
    playgroundRefine.mockReset()
    playgroundOutlineGenerate.mockReset()
    playgroundOutlineRefine.mockReset()
    navigate.mockReset()
  })

  it('maps topicsMut ApiError 40203 to playground quota', async () => {
    playgroundTopics.mockRejectedValue(new ApiError('quota', 40203, 402))
    let session = emptySession()
    const { result } = renderHook(
      () =>
        usePlaygroundActions({
          session,
          setSession: (updater) => {
            session = typeof updater === 'function' ? updater(session) : updater
          },
          persistSession: vi.fn(),
          resetSession: vi.fn(),
          onHandoffClose: vi.fn(),
          onOutlineViewOpen: vi.fn(),
        }),
      { wrapper: createWrapper() },
    )

    await act(async () => {
      result.current.topicsMut.mutate()
    })

    await waitFor(() => {
      expect(result.current.quotaError).toBe('playground')
      expect(result.current.quotaBlocked).toBe(true)
    })
  })

  it('mode=all creates one project per selected topic then resets', async () => {
    playgroundHandoff
      .mockResolvedValueOnce({ project_id: 'p1' })
      .mockResolvedValueOnce({ project_id: 'p2' })
    const resetSession = vi.fn()
    const onHandoffClose = vi.fn()
    let session = emptySession()
    const { result } = renderHook(
      () =>
        usePlaygroundActions({
          session,
          setSession: (updater) => {
            session = typeof updater === 'function' ? updater(session) : updater
          },
          persistSession: vi.fn(),
          resetSession,
          onHandoffClose,
          onOutlineViewOpen: vi.fn(),
        }),
      { wrapper: createWrapper() },
    )

    await act(async () => {
      result.current.handoffMut.mutate({
        mode: 'all',
        pipeline_id: 'long_article',
        title: topicA.title,
        brief: 'focus brief',
        hooks: 'hooks',
        outline: undefined,
        raw_notes: 'notes',
        target_platform_keys: ['xhs'],
        primary_platform_key: 'xhs',
      })
    })

    await waitFor(() => expect(playgroundHandoff).toHaveBeenCalledTimes(2))
    expect(playgroundHandoff.mock.calls[0][0]).toMatchObject({
      title: '选题 A',
      brief: 'focus brief',
    })
    expect(playgroundHandoff.mock.calls[1][0]).toMatchObject({
      title: '选题 B',
      brief: '理由 B',
      raw_notes: '',
    })
    await waitFor(() => expect(resetSession).toHaveBeenCalled())
    expect(onHandoffClose).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/')
  })

  it('mode=current removes focus topic and navigates to the new project', async () => {
    playgroundHandoff.mockResolvedValue({ project_id: 'p-new' })
    const persistSession = vi.fn()
    let session = emptySession()
    const { result } = renderHook(
      () =>
        usePlaygroundActions({
          session,
          setSession: (updater) => {
            session = typeof updater === 'function' ? updater(session) : updater
          },
          persistSession,
          resetSession: vi.fn(),
          onHandoffClose: vi.fn(),
          onOutlineViewOpen: vi.fn(),
        }),
      { wrapper: createWrapper() },
    )

    await act(async () => {
      result.current.handoffMut.mutate({
        mode: 'current',
        pipeline_id: 'long_article',
        title: topicA.title,
        brief: 'brief',
        target_platform_keys: ['xhs'],
        primary_platform_key: 'xhs',
      })
    })

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/projects/p-new'))
    expect(persistSession).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedTopics: [topicB],
        selectedTopic: topicB,
      }),
    )
  })

  it('surfaces actionError when mode=all fails mid-loop without resetting', async () => {
    playgroundHandoff
      .mockResolvedValueOnce({ project_id: 'p1' })
      .mockRejectedValueOnce(new Error('boom'))
    const resetSession = vi.fn()
    let session = emptySession()
    const { result } = renderHook(
      () =>
        usePlaygroundActions({
          session,
          setSession: (updater) => {
            session = typeof updater === 'function' ? updater(session) : updater
          },
          persistSession: vi.fn(),
          resetSession,
          onHandoffClose: vi.fn(),
          onOutlineViewOpen: vi.fn(),
        }),
      { wrapper: createWrapper() },
    )

    await act(async () => {
      result.current.handoffMut.mutate({
        mode: 'all',
        pipeline_id: 'long_article',
        title: topicA.title,
        brief: 'brief',
        target_platform_keys: ['xhs'],
        primary_platform_key: 'xhs',
      })
    })

    await waitFor(() => expect(result.current.actionError).toBe('boom'))
    expect(resetSession).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    expect(playgroundHandoff).toHaveBeenCalledTimes(2)
  })
})

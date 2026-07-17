import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { captureSelection } from '../lib/editorSelection'
import { useSelectionRewrite } from '../hooks/useSelectionRewrite'

const aiSuggest = vi.fn()

vi.mock('../api/creator', () => ({
  aiSuggest: (...args: unknown[]) => aiSuggest(...args),
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useSelectionRewrite', () => {
  beforeEach(() => {
    aiSuggest.mockReset()
  })

  it('keeps draft unchanged until preview confirm', async () => {
    aiSuggest.mockResolvedValue({ suggestion: '新中间段', variants: [] })
    let content = '钩子。旧中间段。CTA。'
    let selection = captureSelection(content, 3, 7)
    const setContent = vi.fn((next: string | ((c: string) => string)) => {
      content = typeof next === 'function' ? next(content) : next
    })
    const setSelection = vi.fn((next) => {
      selection = next
    })

    const { result, rerender } = renderHook(
      () =>
        useSelectionRewrite({
          projectId: 'p1',
          stepKey: 'script',
          aiEnabled: true,
          isPublish: false,
          content,
          selection,
          setContent,
          setSelection,
          handleApiError: vi.fn(),
          setQuotaError: vi.fn(),
        }),
      { wrapper },
    )

    await act(async () => {
      result.current.onRewrite('更简短')
    })

    await waitFor(() => expect(result.current.preview).toBe('新中间段'))
    expect(setContent).not.toHaveBeenCalled()
    expect(result.current.locked).toBe(true)

    rerender()
    act(() => {
      result.current.onConfirm()
    })

    expect(setContent).toHaveBeenCalled()
    expect(content).toBe('钩子。新中间段。CTA。')
  })

  it('cancel leaves content unchanged and unlocks', async () => {
    aiSuggest.mockResolvedValue({ suggestion: '候选', variants: [] })
    const content = '全文选中片段尾'
    const selection = captureSelection(content, 2, 6)
    const setContent = vi.fn()
    const { result } = renderHook(
      () =>
        useSelectionRewrite({
          projectId: 'p1',
          stepKey: 'body',
          aiEnabled: true,
          isPublish: false,
          content,
          selection,
          setContent,
          setSelection: vi.fn(),
          handleApiError: vi.fn(),
          setQuotaError: vi.fn(),
        }),
      { wrapper },
    )

    await act(async () => {
      result.current.onRewrite('更口语')
    })
    await waitFor(() => expect(result.current.preview).toBe('候选'))

    act(() => {
      result.current.onCancel()
    })

    expect(setContent).not.toHaveBeenCalled()
    expect(result.current.preview).toBeNull()
    expect(result.current.locked).toBe(false)
  })

  it('unlocks immediately when canceling an in-flight regenerate', async () => {
    let resolveFirst!: (value: { suggestion: string; variants: unknown[] }) => void
    aiSuggest.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve
        }),
    )
    aiSuggest.mockImplementationOnce(
      () =>
        new Promise(() => {
          /* hang until abort */
        }),
    )

    const content = '钩子。旧中间段。CTA。'
    const selection = captureSelection(content, 3, 7)
    const { result } = renderHook(
      () =>
        useSelectionRewrite({
          projectId: 'p1',
          stepKey: 'script',
          aiEnabled: true,
          isPublish: false,
          content,
          selection,
          setContent: vi.fn(),
          setSelection: vi.fn(),
          handleApiError: vi.fn(),
          setQuotaError: vi.fn(),
        }),
      { wrapper },
    )

    await act(async () => {
      result.current.onRewrite('更简短')
    })
    await act(async () => {
      resolveFirst({ suggestion: '候选一', variants: [] })
    })
    await waitFor(() => expect(result.current.preview).toBe('候选一'))

    await act(async () => {
      result.current.onRegenerate()
    })
    expect(result.current.loading).toBe(true)
    expect(result.current.locked).toBe(true)

    act(() => {
      result.current.onCancel()
    })

    expect(result.current.preview).toBeNull()
    expect(result.current.locked).toBe(false)
    expect(result.current.loading).toBe(false)
  })

  it('keeps float visible when quota blocks after a preview is open', async () => {
    aiSuggest.mockResolvedValue({ suggestion: '候选', variants: [] })
    const content = '钩子。旧中间段。CTA。'
    const selection = captureSelection(content, 3, 7)
    const { result, rerender } = renderHook(
      ({ quotaBlocked }: { quotaBlocked: boolean }) =>
        useSelectionRewrite({
          projectId: 'p1',
          stepKey: 'script',
          aiEnabled: true,
          isPublish: false,
          content,
          selection,
          setContent: vi.fn(),
          setSelection: vi.fn(),
          handleApiError: vi.fn(),
          setQuotaError: vi.fn(),
          quotaBlocked,
        }),
      { wrapper, initialProps: { quotaBlocked: false } },
    )

    await act(async () => {
      result.current.onRewrite('更简短')
    })
    await waitFor(() => expect(result.current.preview).toBe('候选'))

    rerender({ quotaBlocked: true })

    expect(result.current.preview).toBe('候选')
    expect(result.current.locked).toBe(true)
    expect(result.current.showFloat).toBe(true)
  })

  it('flushes draft before starting a rewrite', async () => {
    aiSuggest.mockResolvedValue({ suggestion: '候选', variants: [] })
    const flushDraft = vi.fn().mockResolvedValue(undefined)
    const content = '钩子。旧中间段。CTA。'
    const selection = captureSelection(content, 3, 7)
    const { result } = renderHook(
      () =>
        useSelectionRewrite({
          projectId: 'p1',
          stepKey: 'script',
          aiEnabled: true,
          isPublish: false,
          content,
          selection,
          setContent: vi.fn(),
          setSelection: vi.fn(),
          handleApiError: vi.fn(),
          setQuotaError: vi.fn(),
          flushDraft,
        }),
      { wrapper },
    )

    await act(async () => {
      result.current.onRewrite('更简短')
    })
    await waitFor(() => expect(result.current.preview).toBe('候选'))
    expect(flushDraft).toHaveBeenCalledOnce()
    expect(flushDraft.mock.invocationCallOrder[0]!).toBeLessThan(
      aiSuggest.mock.invocationCallOrder[0]!,
    )
  })

  it('refuses confirm when live content diverged from locked snapshot', async () => {
    aiSuggest.mockResolvedValue({ suggestion: '新中间段', variants: [] })
    let content = '钩子。旧中间段。CTA。'
    const selection = captureSelection(content, 3, 7)
    const setActionError = vi.fn()
    const setContent = vi.fn()
    const { result, rerender } = renderHook(
      () =>
        useSelectionRewrite({
          projectId: 'p1',
          stepKey: 'script',
          aiEnabled: true,
          isPublish: false,
          content,
          selection,
          setContent,
          setSelection: vi.fn(),
          handleApiError: vi.fn(),
          setQuotaError: vi.fn(),
          setActionError,
        }),
      { wrapper },
    )

    await act(async () => {
      result.current.onRewrite('更简短')
    })
    await waitFor(() => expect(result.current.preview).toBe('新中间段'))

    content = '钩子。被平台同步改过。CTA。'
    rerender()
    act(() => {
      result.current.onConfirm()
    })

    expect(setContent).not.toHaveBeenCalled()
    expect(setActionError).toHaveBeenCalledWith('稿面在预览期间已变化，请取消后重新改写')
    expect(result.current.preview).toBeNull()
    expect(result.current.locked).toBe(false)
  })

  it('regenerates preview with the same adjustment and locked selection', async () => {
    aiSuggest
      .mockResolvedValueOnce({ suggestion: '候选一', variants: [] })
      .mockResolvedValueOnce({ suggestion: '候选二', variants: [] })
    const content = '钩子。旧中间段。CTA。'
    const selection = captureSelection(content, 3, 7)
    const { result } = renderHook(
      () =>
        useSelectionRewrite({
          projectId: 'p1',
          stepKey: 'script',
          aiEnabled: true,
          isPublish: false,
          content,
          selection,
          setContent: vi.fn(),
          setSelection: vi.fn(),
          handleApiError: vi.fn(),
          setQuotaError: vi.fn(),
        }),
      { wrapper },
    )

    await act(async () => {
      result.current.onRewrite('更简短')
    })
    await waitFor(() => expect(result.current.preview).toBe('候选一'))

    await act(async () => {
      result.current.onRegenerate()
    })
    await waitFor(() => expect(result.current.preview).toBe('候选二'))

    expect(aiSuggest).toHaveBeenCalledTimes(2)
    expect(aiSuggest).toHaveBeenNthCalledWith(
      2,
      'p1',
      'script',
      '更简短',
      expect.objectContaining({ mode: 'selection', selectedText: '旧中间段' }),
    )
    expect(result.current.locked).toBe(true)
  })

  it('resets preview lock when stepKey changes', async () => {
    aiSuggest.mockResolvedValue({ suggestion: '候选', variants: [] })
    const content = '钩子。旧中间段。CTA。'
    const selection = captureSelection(content, 3, 7)
    let stepKey = 'script'
    const { result, rerender } = renderHook(
      () =>
        useSelectionRewrite({
          projectId: 'p1',
          stepKey,
          aiEnabled: true,
          isPublish: false,
          content,
          selection,
          setContent: vi.fn(),
          setSelection: vi.fn(),
          handleApiError: vi.fn(),
          setQuotaError: vi.fn(),
        }),
      { wrapper },
    )

    await act(async () => {
      result.current.onRewrite('更简短')
    })
    await waitFor(() => expect(result.current.preview).toBe('候选'))

    stepKey = 'hook'
    rerender()
    expect(result.current.preview).toBeNull()
    expect(result.current.locked).toBe(false)
  })
})

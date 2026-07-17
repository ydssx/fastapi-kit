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

  it('hides float for whitespace-only selection', () => {
    const content = '钩子。   。CTA'
    const selection = captureSelection(content, 3, 6)
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

    expect(result.current.showFloat).toBe(false)
  })
})

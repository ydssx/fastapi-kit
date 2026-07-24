import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDismissiblePopover } from './useDismissiblePopover'

describe('useDismissiblePopover', () => {
  it('closes on Escape and stops other document listeners in the same tick', () => {
    const { result } = renderHook(() => useDismissiblePopover(true))
    expect(result.current.open).toBe(true)

    const outer = vi.fn()
    document.addEventListener('keydown', outer)

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      )
    })

    expect(result.current.open).toBe(false)
    expect(outer).not.toHaveBeenCalled()
    document.removeEventListener('keydown', outer)
  })

  it('closes on outside mousedown and ignores inside clicks', () => {
    const { result } = renderHook(() => useDismissiblePopover(true))
    const root = document.createElement('div')
    const inside = document.createElement('button')
    root.appendChild(inside)
    document.body.appendChild(root)
    // Attach the hook's rootRef to a real node.
    Object.defineProperty(result.current.rootRef, 'current', {
      configurable: true,
      value: root,
    })

    act(() => {
      inside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })
    expect(result.current.open).toBe(true)

    act(() => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })
    expect(result.current.open).toBe(false)

    root.remove()
  })

  it('removes listeners when closed', () => {
    const { result } = renderHook(() => useDismissiblePopover(true))
    act(() => {
      result.current.close()
    })
    expect(result.current.open).toBe(false)

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(result.current.open).toBe(false)
  })
})

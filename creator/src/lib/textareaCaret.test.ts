import { describe, expect, it } from 'vitest'
import { getSelectionFloatingAnchor, getTextareaCaretPoint } from './textareaCaret'

function mountTextarea(value: string, opts?: { top?: number; left?: number }) {
  const ta = document.createElement('textarea')
  ta.value = value
  ta.style.position = 'fixed'
  ta.style.top = `${opts?.top ?? 80}px`
  ta.style.left = `${opts?.left ?? 40}px`
  ta.style.width = '320px'
  ta.style.height = '160px'
  ta.style.padding = '8px'
  ta.style.font = '16px monospace'
  ta.style.lineHeight = '24px'
  ta.style.whiteSpace = 'pre-wrap'
  document.body.appendChild(ta)
  return ta
}

describe('textareaCaret', () => {
  it('measures a caret point inside the textarea', () => {
    const ta = mountTextarea('hello world')
    const point = getTextareaCaretPoint(ta, 5)
    expect(point.height).toBeGreaterThan(0)
    expect(Number.isFinite(point.top)).toBe(true)
    expect(Number.isFinite(point.left)).toBe(true)
    ta.remove()
  })

  it('anchors the float below the selection by default', () => {
    const ta = mountTextarea('select this span please')
    const anchor = getSelectionFloatingAnchor(ta, 7, 11, 200, 40)
    expect(anchor.placement).toBe('below')
    expect(anchor.top).toBeGreaterThan(0)
    expect(anchor.left).toBeGreaterThanOrEqual(8)
    expect(anchor.arrowLeft).toBeGreaterThan(0)
    ta.remove()
  })

  it('flips above when there is not enough room below', () => {
    const ta = mountTextarea('near the bottom of the viewport')
    const fakeTop = window.innerHeight - 70
    ta.getBoundingClientRect = () =>
      ({
        top: fakeTop,
        bottom: fakeTop + 160,
        left: 40,
        right: 360,
        width: 320,
        height: 160,
        x: 40,
        y: fakeTop,
        toJSON() {
          return {}
        },
      }) as DOMRect
    const anchor = getSelectionFloatingAnchor(ta, 0, 4, 240, 120)
    expect(anchor.placement).toBe('above')
    ta.remove()
  })

  it('aligns preview panels to the selection start within the textarea band', () => {
    const ta = mountTextarea('abcdefghijklmnop')
    const centered = getSelectionFloatingAnchor(ta, 2, 6, 280, 40, { align: 'center' })
    const started = getSelectionFloatingAnchor(ta, 2, 6, 280, 40, {
      align: 'start',
      clampToTextareaX: true,
    })
    expect(started.left).toBeGreaterThanOrEqual(ta.getBoundingClientRect().left - 0.5)
    expect(started.left).toBeGreaterThanOrEqual(centered.left - 1)
    ta.remove()
  })
})

import { describe, expect, it } from 'vitest'
import { getSelectionFloatingAnchor, getTextareaCaretPoint } from './textareaCaret'

function mountTextarea(value: string) {
  const ta = document.createElement('textarea')
  ta.value = value
  ta.style.width = '320px'
  ta.style.height = '120px'
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
    ta.remove()
  })
})

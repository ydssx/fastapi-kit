/** Mirror-based caret metrics for a textarea (relative to the textarea content box). */

export interface TextareaCaretPoint {
  top: number
  left: number
  height: number
}

export interface FloatingAnchor {
  top: number
  left: number
  placement: 'below' | 'above'
  /** Arrow X within the float, relative to float left edge. */
  arrowLeft: number
}

export interface FloatingAnchorOptions {
  /** Horizontal alignment relative to the selection. Preview panels prefer `start`. */
  align?: 'center' | 'start'
  gap?: number
  viewportPadding?: number
  /** When true, prefer keeping the float within the textarea's horizontal band. */
  clampToTextareaX?: boolean
}

function copyTextareaStyles(textarea: HTMLTextAreaElement, mirror: HTMLDivElement) {
  const style = window.getComputedStyle(textarea)
  mirror.style.position = 'absolute'
  mirror.style.visibility = 'hidden'
  mirror.style.top = '0'
  mirror.style.left = '-9999px'
  mirror.style.boxSizing = style.boxSizing
  mirror.style.width = `${textarea.clientWidth}px`
  mirror.style.height = `${textarea.clientHeight}px`
  mirror.style.overflow = 'hidden'
  mirror.style.borderTopWidth = style.borderTopWidth
  mirror.style.borderRightWidth = style.borderRightWidth
  mirror.style.borderBottomWidth = style.borderBottomWidth
  mirror.style.borderLeftWidth = style.borderLeftWidth
  mirror.style.borderStyle = style.borderStyle
  mirror.style.paddingTop = style.paddingTop
  mirror.style.paddingRight = style.paddingRight
  mirror.style.paddingBottom = style.paddingBottom
  mirror.style.paddingLeft = style.paddingLeft
  mirror.style.font = style.font
  mirror.style.letterSpacing = style.letterSpacing
  mirror.style.lineHeight = style.lineHeight
  mirror.style.textAlign = style.textAlign
  mirror.style.textTransform = style.textTransform
  mirror.style.textIndent = style.textIndent
  mirror.style.whiteSpace = 'pre-wrap'
  mirror.style.wordWrap = 'break-word'
  mirror.style.wordBreak = style.wordBreak
}

export function getTextareaCaretPoint(
  textarea: HTMLTextAreaElement,
  position: number,
): TextareaCaretPoint {
  const mirror = document.createElement('div')
  copyTextareaStyles(textarea, mirror)

  const value = textarea.value
  const marker = document.createElement('span')
  marker.textContent = '\u200b'

  mirror.append(document.createTextNode(value.slice(0, position)), marker)
  mirror.append(document.createTextNode(value.slice(position) || '.'))

  document.body.appendChild(mirror)
  const top = marker.offsetTop - textarea.scrollTop
  const left = marker.offsetLeft - textarea.scrollLeft
  const height =
    marker.offsetHeight || parseFloat(window.getComputedStyle(textarea).lineHeight) || 20
  document.body.removeChild(mirror)

  return { top, left, height }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(n, max))
}

/** Viewport-fixed anchor just below (or above) the current textarea selection. */
export function getSelectionFloatingAnchor(
  textarea: HTMLTextAreaElement,
  start: number,
  end: number,
  floatWidth = 320,
  floatHeight = 48,
  options: FloatingAnchorOptions = {},
): FloatingAnchor {
  const {
    align = 'center',
    gap = 10,
    viewportPadding: pad = 8,
    clampToTextareaX = true,
  } = options

  const from = Math.min(start, end)
  const to = Math.max(start, end)
  const startPoint = getTextareaCaretPoint(textarea, from)
  const endPoint = getTextareaCaretPoint(textarea, to)
  const rect = textarea.getBoundingClientRect()

  const selTop = rect.top + Math.min(startPoint.top, endPoint.top)
  const selBottom =
    rect.top + Math.max(startPoint.top + startPoint.height, endPoint.top + endPoint.height)
  const selStartX = rect.left + startPoint.left
  const selEndX = rect.left + endPoint.left
  const selMidX = (selStartX + selEndX) / 2
  const anchorX = align === 'start' ? selStartX : selMidX

  const spaceBelow = window.innerHeight - selBottom - pad
  const spaceAbove = selTop - pad
  const need = floatHeight + gap

  let placement: 'below' | 'above'
  if (spaceBelow >= need) {
    placement = 'below'
  } else if (spaceAbove >= need) {
    placement = 'above'
  } else {
    // Neither side fits fully — pick the roomier side and clamp later.
    placement = spaceBelow >= spaceAbove ? 'below' : 'above'
  }

  let top = placement === 'below' ? selBottom + gap : selTop - floatHeight - gap

  // If clamping would drag the float over the selection mid-line, flip when the other side has any room.
  const midY = (selTop + selBottom) / 2
  const clampedTop = clamp(top, pad, window.innerHeight - floatHeight - pad)
  const coversMid =
    clampedTop < midY && clampedTop + floatHeight > midY && Math.min(spaceAbove, spaceBelow) > gap
  if (coversMid) {
    const alt: 'below' | 'above' = placement === 'below' ? 'above' : 'below'
    const altTop = alt === 'below' ? selBottom + gap : selTop - floatHeight - gap
    const altSpace = alt === 'below' ? spaceBelow : spaceAbove
    if (altSpace > gap) {
      placement = alt
      top = altTop
    }
  }

  top = clamp(top, pad, Math.max(pad, window.innerHeight - floatHeight - pad))

  let left =
    align === 'start' ? anchorX : anchorX - floatWidth / 2

  let minLeft = pad
  let maxLeft = window.innerWidth - floatWidth - pad
  if (clampToTextareaX) {
    minLeft = Math.max(minLeft, rect.left)
    maxLeft = Math.min(maxLeft, rect.right - floatWidth)
    if (minLeft > maxLeft) {
      // Textarea narrower than float — fall back to viewport clamp only.
      minLeft = pad
      maxLeft = window.innerWidth - floatWidth - pad
    }
  }
  left = clamp(left, minLeft, Math.max(minLeft, maxLeft))

  const arrowLeft = clamp(anchorX - left, 16, Math.max(16, floatWidth - 16))

  return { top, left, placement, arrowLeft }
}

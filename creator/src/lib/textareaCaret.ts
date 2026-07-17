/** Mirror-based caret metrics for a textarea (relative to the textarea content box). */

export interface TextareaCaretPoint {
  top: number
  left: number
  height: number
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

export interface FloatingAnchor {
  top: number
  left: number
  placement: 'below' | 'above'
}

/** Viewport-fixed anchor just below (or above) the current textarea selection. */
export function getSelectionFloatingAnchor(
  textarea: HTMLTextAreaElement,
  start: number,
  end: number,
  floatWidth = 320,
  floatHeight = 48,
): FloatingAnchor {
  const from = Math.min(start, end)
  const to = Math.max(start, end)
  const startPoint = getTextareaCaretPoint(textarea, from)
  const endPoint = getTextareaCaretPoint(textarea, to)
  const rect = textarea.getBoundingClientRect()

  const selTop = rect.top + Math.min(startPoint.top, endPoint.top)
  const selBottom =
    rect.top + Math.max(startPoint.top + startPoint.height, endPoint.top + endPoint.height)
  const selLeft = rect.left + (startPoint.left + endPoint.left) / 2

  const gap = 8
  const spaceBelow = window.innerHeight - selBottom
  const placement: 'below' | 'above' =
    spaceBelow < floatHeight + gap && selTop > floatHeight + gap ? 'above' : 'below'

  let top = placement === 'below' ? selBottom + gap : selTop - floatHeight - gap
  let left = selLeft - floatWidth / 2

  const pad = 8
  left = Math.max(pad, Math.min(left, window.innerWidth - floatWidth - pad))
  top = Math.max(pad, Math.min(top, window.innerHeight - floatHeight - pad))

  return { top, left, placement }
}

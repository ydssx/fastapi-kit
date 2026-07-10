export interface TextSelection {
  start: number
  end: number
  value: string
}

export function captureSelection(value: string, start: number, end: number): TextSelection {
  return { start, end, value }
}

export function isSelectionCurrent(
  selection: TextSelection | null,
  value: string,
): selection is TextSelection {
  return selection !== null && selection.value === value && selection.start <= selection.end
}

export function hasActiveSelection(selection: TextSelection | null, value: string): boolean {
  return isSelectionCurrent(selection, value) && selection.start !== selection.end
}

export function applySelectionInsertion(
  value: string,
  selection: TextSelection,
  insertion: string,
): { content: string; selection: TextSelection } {
  const content = `${value.slice(0, selection.start)}${insertion}${value.slice(selection.end)}`
  const caret = selection.start + insertion.length

  return { content, selection: captureSelection(content, caret, caret) }
}

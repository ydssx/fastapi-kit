import { describe, expect, it } from 'vitest'
import {
  applySelectionInsertion,
  captureSelection,
  hasActiveSelection,
  isSelectionCurrent,
} from './editorSelection'

describe('editor selection', () => {
  it('replaces the captured selection and places the caret after inserted text', () => {
    const selection = captureSelection('你好世界', 2, 4)

    expect(applySelectionInsertion('你好世界', selection, '创作者')).toEqual({
      content: '你好创作者',
      selection: { start: 5, end: 5, value: '你好创作者' },
    })
  })

  it('inserts at the caret without replacing content', () => {
    const selection = captureSelection('你好世界', 2, 2)

    expect(applySelectionInsertion('你好世界', selection, '，')).toEqual({
      content: '你好，世界',
      selection: { start: 3, end: 3, value: '你好，世界' },
    })
  })

  it('rejects a selection once its source content changed', () => {
    const selection = captureSelection('原始草稿', 0, 2)

    expect(isSelectionCurrent(selection, '已修改草稿')).toBe(false)
    expect(hasActiveSelection(selection, '已修改草稿')).toBe(false)
  })
})

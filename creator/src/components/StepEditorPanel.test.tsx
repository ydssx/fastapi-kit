import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StepEditorPanel } from './StepEditorPanel'

describe('StepEditorPanel', () => {
  it('reports the textarea selection to its parent', () => {
    const onSelectionChange = vi.fn()
    render(
      <StepEditorPanel
        title="开场"
        content="你好世界"
        onContentChange={vi.fn()}
        onSelectionChange={onSelectionChange}
        onSaveDraft={vi.fn()}
        onConfirm={vi.fn()}
        savingDraft={false}
        confirming={false}
      />,
    )

    const editor = screen.getByRole('textbox') as HTMLTextAreaElement
    editor.setSelectionRange(1, 3)
    fireEvent.select(editor)

    expect(onSelectionChange).toHaveBeenCalledWith(1, 3)
  })
})

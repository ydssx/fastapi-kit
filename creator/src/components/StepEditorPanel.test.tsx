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

  it('提供可访问的素材库入口', () => {
    const onPickImage = vi.fn()
    render(
      <StepEditorPanel
        title="开场"
        content=""
        onContentChange={vi.fn()}
        onSelectionChange={vi.fn()}
        onSaveDraft={vi.fn()}
        onConfirm={vi.fn()}
        onPickImage={onPickImage}
        savingDraft={false}
        confirming={false}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '从素材库添加图片' }))
    expect(onPickImage).toHaveBeenCalledOnce()
  })

  it('改写预览锁定时提示预览确认中', () => {
    render(
      <StepEditorPanel
        title="正文"
        content="草稿"
        onContentChange={vi.fn()}
        onSelectionChange={vi.fn()}
        onSaveDraft={vi.fn()}
        onConfirm={vi.fn()}
        savingDraft={false}
        confirming={false}
        editorDisabled
        lockReason="rewrite-preview"
      />,
    )

    expect(screen.getByText('预览确认中，稿面已锁定')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('AI 生成锁定时提示 AI 生成中', () => {
    render(
      <StepEditorPanel
        title="正文"
        content="草稿"
        onContentChange={vi.fn()}
        onSelectionChange={vi.fn()}
        onSaveDraft={vi.fn()}
        onConfirm={vi.fn()}
        savingDraft={false}
        confirming={false}
        editorDisabled
        lockReason="ai-generating"
      />,
    )

    expect(screen.getByText('AI 生成中，稿面已锁定')).toBeInTheDocument()
    expect(screen.queryByText('预览确认中，稿面已锁定')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeDisabled()
  })
})

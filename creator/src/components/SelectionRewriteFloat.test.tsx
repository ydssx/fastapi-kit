import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SelectionRewriteFloat } from './SelectionRewriteFloat'

describe('SelectionRewriteFloat', () => {
  const noopRegen = vi.fn()

  it('shows rewrite chips before preview', () => {
    const onRewrite = vi.fn()
    render(
      <SelectionRewriteFloat
        chips={[{ label: '更短', adjustment: '更简短' }]}
        loading={false}
        preview={null}
        locked={false}
        onRewrite={onRewrite}
        onRegenerate={noopRegen}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '更短' }))
    expect(onRewrite).toHaveBeenCalledWith('更简短')
  })

  it('requires confirm before applying previewed text', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <SelectionRewriteFloat
        chips={[]}
        loading={false}
        preview="新中间段"
        locked
        onRewrite={vi.fn()}
        onRegenerate={noopRegen}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )

    expect(screen.getByText('新中间段')).toBeInTheDocument()
    expect(screen.getByText(/预览改写/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '更短' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重新生成' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(onCancel).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: '确认替换选区' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onRegenerate from the preview icon button', () => {
    const onRegenerate = vi.fn()
    render(
      <SelectionRewriteFloat
        chips={[]}
        loading={false}
        preview="候选稿"
        locked
        onRewrite={vi.fn()}
        onRegenerate={onRegenerate}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '重新生成' }))
    expect(onRegenerate).toHaveBeenCalledOnce()
  })

  it('disables regenerate while loading preview', () => {
    render(
      <SelectionRewriteFloat
        chips={[]}
        loading
        preview="候选稿"
        locked
        onRewrite={vi.fn()}
        onRegenerate={vi.fn()}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '重新生成' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '确认替换选区' })).toBeDisabled()
    expect(screen.getByText('重新生成中…')).toBeInTheDocument()
  })

  it('disables chips while loading', () => {
    render(
      <SelectionRewriteFloat
        chips={[{ label: '更短', adjustment: '更简短' }]}
        loading
        preview={null}
        locked
        onRewrite={vi.fn()}
        onRegenerate={noopRegen}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '更短' })).toBeDisabled()
    expect(screen.getByText('改写中…')).toBeInTheDocument()
  })

  it('disables chips when actionsDisabled', () => {
    const onRewrite = vi.fn()
    render(
      <SelectionRewriteFloat
        chips={[{ label: '更短', adjustment: '更简短' }]}
        loading={false}
        preview={null}
        locked={false}
        actionsDisabled
        onRewrite={onRewrite}
        onRegenerate={noopRegen}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '更短' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '更短' }))
    expect(onRewrite).not.toHaveBeenCalled()
  })
})

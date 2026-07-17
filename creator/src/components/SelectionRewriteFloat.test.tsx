import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SelectionRewriteFloat } from './SelectionRewriteFloat'

describe('SelectionRewriteFloat', () => {
  it('shows rewrite chips before preview', () => {
    const onRewrite = vi.fn()
    render(
      <SelectionRewriteFloat
        chips={[{ label: '更短', adjustment: '更简短' }]}
        loading={false}
        preview={null}
        locked={false}
        onRewrite={onRewrite}
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
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )

    expect(screen.getByText('新中间段')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '更短' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(onCancel).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: '确认替换选区' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('disables chips while loading', () => {
    render(
      <SelectionRewriteFloat
        chips={[{ label: '更短', adjustment: '更简短' }]}
        loading
        preview={null}
        locked
        onRewrite={vi.fn()}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '更短' })).toBeDisabled()
    expect(screen.getByText('改写中…')).toBeInTheDocument()
  })
})

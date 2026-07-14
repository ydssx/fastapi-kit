import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PlaygroundHandoffModal, type HandoffPayload } from './PlaygroundHandoffModal'

function HandoffHarness({
  selectedCount = 1,
  remainingCompletedQuota = 2,
  onConfirm = vi.fn(),
}: {
  selectedCount?: number
  remainingCompletedQuota?: number | null
  onConfirm?: (payload: HandoffPayload) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        交接到项目
      </button>
      <PlaygroundHandoffModal
        open={open}
        title="夏日护肤"
        brief="为敏感肌介绍防晒步骤"
        hooks="先说常见误区"
        understanding={null}
        outline={null}
        pipelines={[
          { id: 'long_article', title: '长图文', description: '', steps: [] },
          { id: 'short_video', title: '短视频', description: '', steps: [] },
        ]}
        selectedCount={selectedCount}
        remainingCompletedQuota={remainingCompletedQuota}
        loading={false}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
      />
    </>
  )
}

describe('PlaygroundHandoffModal', () => {
  it('closes on Escape and restores the trigger', async () => {
    const user = userEvent.setup()
    render(<HandoffHarness />)

    const trigger = screen.getByRole('button', { name: '交接到项目' })
    await user.click(trigger)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('defaults pipeline to long_article and shows mixed modes when multi-selected', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<HandoffHarness selectedCount={3} onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: '交接到项目' }))
    expect(screen.getByRole('group', { name: '混合交接' })).toBeInTheDocument()

    const pipeline = screen.getByRole('combobox')
    expect(pipeline).toHaveValue('long_article')

    await user.click(screen.getByLabelText(/立刻把勾选的 3 条都建成项目/))
    expect(screen.getByText(/本月还可完成 2 个项目/)).toBeInTheDocument()
    const createBtn = screen.getByRole('button', { name: '创建 3 个项目' })
    expect(createBtn).toBeDisabled()

    await user.click(screen.getByLabelText(/我已知晓并继续/))
    expect(createBtn).not.toBeDisabled()
    await user.click(createBtn)
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'all', pipeline_id: 'long_article' }),
    )
  })
})

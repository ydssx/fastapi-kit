import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PlaygroundHandoffModal } from './PlaygroundHandoffModal'

function HandoffHarness() {
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
        pipelines={[{ id: 'short_video', title: '短视频', description: '', steps: [] }]}
        loading={false}
        onClose={() => setOpen(false)}
        onConfirm={vi.fn()}
      />
    </>
  )
}

describe('PlaygroundHandoffModal', () => {
  it('traps focus, closes on Escape, and restores the trigger', async () => {
    const user = userEvent.setup()
    render(<HandoffHarness />)

    const trigger = screen.getByRole('button', { name: '交接到项目' })
    await user.click(trigger)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveFocus()

    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: '取消' })).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})

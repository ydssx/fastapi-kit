import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PlatformPicker } from './PlatformPicker'

const OPTIONS = [
  { key: 'xiaohongshu', label: '小红书' },
  { key: 'douyin', label: '抖音' },
]

describe('PlatformPicker', () => {
  it('does not clear the last selected platform', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <PlatformPicker options={OPTIONS} value={['xiaohongshu']} onChange={onChange} legend="发布平台" />,
    )

    await user.click(screen.getByRole('button', { name: /小红书/ }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('allows deselecting when more than one platform is selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <PlatformPicker
        options={OPTIONS}
        value={['xiaohongshu', 'douyin']}
        onChange={onChange}
        legend="发布平台"
      />,
    )

    await user.click(screen.getByRole('button', { name: /小红书/ }))
    expect(onChange).toHaveBeenCalledWith(['douyin'])
  })
})

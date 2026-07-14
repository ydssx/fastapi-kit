import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PublishChecklist } from './PublishChecklist'

describe('PublishChecklist', () => {
  it('disables completion and identifies incomplete platforms', () => {
    render(
      <PublishChecklist
        items={[
          {
            platform: 'xiaohongshu',
            platform_label: '小红书',
            item_key: 'cover',
            label: '确认封面',
            checked: false,
          },
          {
            platform: 'douyin',
            platform_label: '抖音',
            item_key: 'caption',
            label: '确认文案',
            checked: true,
          },
        ]}
        onToggle={vi.fn()}
        onComplete={vi.fn()}
        completing={false}
      />,
    )

    expect(screen.getByRole('button', { name: '完成项目' })).toBeDisabled()
    expect(screen.getByText('小红书还有 1 项待完成')).toBeInTheDocument()
  })
})

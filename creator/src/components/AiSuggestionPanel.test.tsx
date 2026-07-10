import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AiSuggestionPanel } from './AiSuggestionPanel'

describe('AiSuggestionPanel', () => {
  it('offers selection-specific actions when text is selected', () => {
    render(
      <AiSuggestionPanel
        stepTitle="开场"
        suggestion="建议内容"
        variants={[]}
        loading={false}
        quotaBlocked={false}
        sourceParts={[]}
        adjustments={[]}
        hasActiveSelection
        onAdoptAll={vi.fn()}
        onInsert={vi.fn()}
        onReplaceSelection={vi.fn()}
        onRegenerate={vi.fn()}
        onAdjust={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '插入选区' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '替换选区' })).toBeEnabled()
  })
})

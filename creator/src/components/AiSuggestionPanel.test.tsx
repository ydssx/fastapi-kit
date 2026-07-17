import { fireEvent, render, screen } from '@testing-library/react'
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

  it('keeps full-draft adopt path available alongside selection replace', () => {
    const onAdoptAll = vi.fn()
    const onReplaceSelection = vi.fn()
    render(
      <AiSuggestionPanel
        stepTitle="正文"
        suggestion="整段建议稿"
        variants={[]}
        loading={false}
        quotaBlocked={false}
        sourceParts={['品牌档案']}
        adjustments={[{ label: '更短', adjustment: '更简短' }]}
        hasActiveSelection
        onAdoptAll={onAdoptAll}
        onInsert={vi.fn()}
        onReplaceSelection={onReplaceSelection}
        onRegenerate={vi.fn()}
        onAdjust={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '采纳全部' }))
    expect(onAdoptAll).toHaveBeenCalledWith('整段建议稿')
    expect(onReplaceSelection).not.toHaveBeenCalled()
  })

  it('折叠态标题为 AI 建议', () => {
    render(
      <AiSuggestionPanel
        stepTitle="开场"
        suggestion={null}
        variants={[]}
        loading={false}
        quotaBlocked={false}
        sourceParts={[]}
        adjustments={[]}
        hasActiveSelection={false}
        onAdoptAll={vi.fn()}
        onInsert={vi.fn()}
        onReplaceSelection={vi.fn()}
        onRegenerate={vi.fn()}
        onAdjust={vi.fn()}
        mobileCollapsed
        onToggleMobile={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'AI 建议' })).toBeInTheDocument()
    expect(screen.queryByText('要 AI 建议')).not.toBeInTheDocument()
  })
})

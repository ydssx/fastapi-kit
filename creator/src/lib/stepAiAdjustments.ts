/** 每步快捷调整 chip：label 展示，adjustment 传给 API */
export const STEP_AI_ADJUSTMENTS: Record<string, { label: string; adjustment: string }[]> = {
  topic: [{ label: '再给 3 个角度', adjustment: '提供 3 个不同选题角度' }],
  hook: [{ label: '再给 3 个角度', adjustment: '提供 3 个不同钩子角度' }],
  script: [
    { label: '更口语', adjustment: '更口语' },
    { label: '更短', adjustment: '更简短' },
    { label: '加强钩子', adjustment: '开头钩子更强' },
  ],
  storyboard: [
    { label: '更细', adjustment: '分镜更细致' },
    { label: '更简', adjustment: '分镜更精简' },
  ],
  cover: [
    { label: '更吸引点击', adjustment: '标题更吸引点击' },
    { label: '更 SEO', adjustment: '标题更利于搜索' },
  ],
  assets: [{ label: '更简', adjustment: '素材清单更精简' }],
  outline: [{ label: '更细', adjustment: '大纲更细致' }],
  body: [
    { label: '更口语', adjustment: '更口语' },
    { label: '更短', adjustment: '更简短' },
  ],
  summary: [
    { label: '更吸引点击', adjustment: '标题更吸引点击' },
    { label: '更 SEO', adjustment: '更利于搜索' },
  ],
  visuals: [
    { label: '更细', adjustment: '配图要点更细' },
    { label: '更简', adjustment: '配图要点更简' },
  ],
  seo: [
    { label: '更吸引点击', adjustment: '多平台标题更吸引点击' },
    { label: '更 SEO', adjustment: '关键词与话题更利于搜索' },
  ],
}

export function adjustmentsForStep(stepKey: string) {
  return STEP_AI_ADJUSTMENTS[stepKey] ?? []
}

/** 进入步骤时是否自动拉取 AI（第 3 步起，0-based index >= 2） */
export function shouldAutoSuggest(stepIndex: number, aiEnabled: boolean, editorEmpty: boolean) {
  return aiEnabled && editorEmpty && stepIndex >= 2
}

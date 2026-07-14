import type { PlaygroundOutline } from '../types/api'

export function formatOutlineMarkdown(outline: PlaygroundOutline): string {
  const sections = outline.sections
    .map((section, index) => `### ${index + 1}. ${section.title}\n${section.summary}`)
    .join('\n\n')
  return [
    `## 核心主张\n${outline.central_claim}`,
    `## 开头钩子\n${outline.opening_hook}`,
    `## 段落要点\n${sections}`,
    `## 结尾 CTA\n${outline.closing_cta}`,
  ].join('\n\n')
}

export function outlineHandoffStepKey(pipelineId: string): 'hook' | 'outline' {
  return pipelineId === 'long_article' ? 'outline' : 'hook'
}

export function outlineHandoffStepLabel(pipelineId: string): string {
  return pipelineId === 'long_article' ? 'outline 步（长图文大纲）' : 'hook 步（短视频钩子）'
}

export type SourceMode = 'upload' | 'import' | 'generate'

export const SOURCE_LABELS: Record<SourceMode, string> = {
  upload: '本地上传',
  import: '链接导入',
  generate: 'AI 生成',
}

export const SOURCE_BADGE_LABELS: Record<string, string> = {
  upload: '上传',
  url_import: '链接',
  generation: 'AI',
}

export function splitTags(value: string): string[] {
  return [...new Set(value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))]
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

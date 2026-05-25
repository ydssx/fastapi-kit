export const PIPELINE_LABELS: Record<string, string> = {
  short_video: '短视频',
  long_article: '长图文',
}

export const STATUS_LABELS: Record<string, string> = {
  in_progress: '进行中',
  completed: '已完成',
  draft: '草稿',
}

export function pipelineLabel(id: string): string {
  return PIPELINE_LABELS[id] ?? id
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

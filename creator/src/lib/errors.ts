const CREATOR_ERROR_MESSAGES: Record<number, string> = {
  40023: '已进入发布步骤或项目已完成，无法再修改目标平台',
  40024: '该步骤尚未确认，无法回退打开',
}

export function creatorApiErrorMessage(code: number, fallback: string): string {
  return CREATOR_ERROR_MESSAGES[code] ?? fallback
}

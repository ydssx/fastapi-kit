const dateFmt = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function formatProjectDate(iso: string): string {
  return dateFmt.format(new Date(iso))
}

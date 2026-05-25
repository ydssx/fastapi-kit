import shared from '../styles/shared.module.css'

export type QuotaLimitKind = 'ai' | 'projects'

interface QuotaLimitNoticeProps {
  kind: QuotaLimitKind
  plan?: string
}

const COPY: Record<QuotaLimitKind, { title: string; body: string }> = {
  ai: {
    title: 'AI 次数已用尽',
    body: '本月 AI 辅助次数已达上限。升级 Pro 可获更高额度，或等待下月重置。',
  },
  projects: {
    title: '完整项目额度已用尽',
    body: '本月可完成的流水线项目数已达上限。升级 Pro 可创建更多项目，或等待下月重置。',
  },
}

export function QuotaLimitNotice({ kind, plan }: QuotaLimitNoticeProps) {
  const { title, body } = COPY[kind]
  return (
    <div className={shared.notice} role="alert">
      <strong>{title}</strong>
      <p className={shared.muted} style={{ margin: '6px 0 0' }}>
        {body}
        {plan === 'pro' ? ' 你已是 Pro 档位，请联系支持调整额度。' : ''}
      </p>
    </div>
  )
}

export function quotaLimitKindFromCode(code: number): QuotaLimitKind | null {
  if (code === 40201) return 'ai'
  if (code === 40202) return 'projects'
  return null
}

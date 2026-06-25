interface IconProps {
  size?: number
  className?: string
}

/** 品牌 Mark：三阶段竖条 + 舞台光横线 + 薄荷 AI 光心 */
export function CreatorMark({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <rect x="3" y="9" width="2.5" height="7" rx="0.75" fill="currentColor" opacity="0.45" />
      <rect x="10.75" y="6" width="2.5" height="13" rx="0.75" fill="currentColor" />
      <rect x="18.5" y="11" width="2.5" height="5" rx="0.75" fill="currentColor" opacity="0.45" />
      <path d="M1.5 12h21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.75" fill="var(--ai)" />
    </svg>
  )
}

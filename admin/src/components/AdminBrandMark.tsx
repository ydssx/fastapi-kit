type AdminBrandMarkProps = {
  size?: number
  className?: string
}

/** Stack layers + horizontal signal beam — ops console brand mark */
export function AdminBrandMark({ size = 32, className }: AdminBrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect width="32" height="32" rx="8" fill="url(#adminMarkBg)" />
      <rect x="7" y="9" width="18" height="4" rx="1" fill="rgba(255,255,255,0.22)" />
      <rect x="7" y="14" width="18" height="4" rx="1" fill="rgba(255,255,255,0.35)" />
      <rect x="7" y="19" width="18" height="4" rx="1" fill="rgba(255,255,255,0.22)" />
      <path d="M4 16h24" stroke="var(--signal-bright, #2dd4bf)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16" cy="16" r="2.5" fill="var(--signal-bright, #2dd4bf)" />
      <defs>
        <linearGradient id="adminMarkBg" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#134e4a" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
      </defs>
    </svg>
  )
}

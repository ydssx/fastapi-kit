import type { ReactNode } from 'react'

interface IconProps {
  size?: number
  className?: string
}

function IconShell({
  size = 18,
  className,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  )
}

export function ProjectsIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path
        d="M12 3 3 7.5l9 4.5 9-4.5L12 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M3 12l9 4.5L21 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M3 16.5l9 4.5 9-4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </IconShell>
  )
}

export function PlaygroundIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path
        d="M10 2h4v5.2l3.2 7.8a1.8 1.8 0 0 1-1.65 2.5H8.45a1.8 1.8 0 0 1-1.65-2.5L10 7.2V2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M10 2h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M17 3.5v2M17 3.5h2M17 3.5h-2"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </IconShell>
  )
}

export function BrandIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path
        d="M12 3 18 12 12 21 6 12 12 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 8v8M9 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </IconShell>
  )
}

export function AccountIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </IconShell>
  )
}

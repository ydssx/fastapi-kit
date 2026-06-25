import type { ComponentType, ReactNode } from 'react'

interface IconProps {
  size?: number
  className?: string
}

function IconShell({
  size = 16,
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

export function CheckIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path
        d="M6 12.5 10 16.5 18 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconShell>
  )
}

export function TopicStepIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </IconShell>
  )
}

export function HookStepIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path
        d="M8 4c0 4 2 6 6 6 2.5 0 4-1.5 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M18 6v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </IconShell>
  )
}

export function ScriptStepIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path
        d="M8 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M9 9h6M9 12h6M9 15h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </IconShell>
  )
}

export function StoryboardStepIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <rect x="3" y="5" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="5" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="13" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="13" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </IconShell>
  )
}

export function CoverTitleStepIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <rect x="4" y="4" width="16" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4 15h16M8 18h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </IconShell>
  )
}

export function ProductionNotesStepIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <circle cx="6" cy="6" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="18" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 8 16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </IconShell>
  )
}

export function PublishStepIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path
        d="M12 3 20 7v10l-8 4-8-4V7l8-4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 12 20 7M12 12v9M12 12 4 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </IconShell>
  )
}

export function OutlineStepIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path
        d="M6 5h12M6 10h12M6 15h8M6 20h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </IconShell>
  )
}

export function BodyStepIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path
        d="M5 6h14M5 10h14M5 14h14M5 18h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </IconShell>
  )
}

export function TitleSummaryStepIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M6 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M8 13h8M8 17h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </IconShell>
  )
}

export function VisualsStepIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <rect x="4" y="5" width="16" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="10" r="1.5" fill="currentColor" />
      <path
        d="M4 16l4-3 3 2 5-4 4 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </IconShell>
  )
}

export function SeoVariantsStepIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path
        d="M7 7h.01M7 12h.01M7 17h.01M12 7h5M12 12h5M12 17h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </IconShell>
  )
}

const STEP_ICONS: Record<string, ComponentType<IconProps>> = {
  topic: TopicStepIcon,
  hook: HookStepIcon,
  script: ScriptStepIcon,
  storyboard: StoryboardStepIcon,
  cover_title: CoverTitleStepIcon,
  production_notes: ProductionNotesStepIcon,
  publish: PublishStepIcon,
  outline: OutlineStepIcon,
  body: BodyStepIcon,
  title_summary: TitleSummaryStepIcon,
  visuals: VisualsStepIcon,
  seo_variants: SeoVariantsStepIcon,
}

export function StepIcon({ stepKey, ...props }: IconProps & { stepKey: string }) {
  const Icon = STEP_ICONS[stepKey] ?? TopicStepIcon
  return <Icon {...props} />
}

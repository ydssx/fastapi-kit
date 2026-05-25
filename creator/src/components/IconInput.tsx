import type { InputHTMLAttributes, ReactNode } from 'react'
import styles from './IconInput.module.css'

interface IconInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon: ReactNode
}

export function IconInput({ icon, className, ...props }: IconInputProps) {
  return (
    <span className={`${styles.wrap} ${className ?? ''}`}>
      <span className={styles.icon} aria-hidden>
        {icon}
      </span>
      <input className={styles.input} {...props} />
    </span>
  )
}

export function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="m4 8 8 5 8-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="5"
        y="11"
        width="14"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8 11V8a4 4 0 1 1 8 0v3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

import { useEffect, useRef, useState, type RefObject } from 'react'

/** Toggleable popover that closes on outside click or Escape. */
export function useDismissiblePopover(initialOpen = false): {
  open: boolean
  setOpen: (open: boolean | ((prev: boolean) => boolean)) => void
  rootRef: RefObject<HTMLDivElement | null>
} {
  const [open, setOpen] = useState(initialOpen)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return { open, setOpen, rootRef }
}

import { useEffect, useId, useRef, useState, type RefObject } from 'react'

/** Toggleable popover that closes on outside click or Escape. */
export function useDismissiblePopover(initialOpen = false): {
  open: boolean
  setOpen: (open: boolean | ((prev: boolean) => boolean)) => void
  toggle: () => void
  close: () => void
  rootRef: RefObject<HTMLDivElement | null>
  menuId: string
} {
  const [open, setOpen] = useState(initialOpen)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    // Capture so we peel this layer before shell-level Escape listeners on document.
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open])

  return {
    open,
    setOpen,
    toggle: () => setOpen((value) => !value),
    close: () => setOpen(false),
    rootRef,
    menuId,
  }
}

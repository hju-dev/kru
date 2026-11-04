import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Drag for name chips — the *secondary* way to move students (tap-to-place is primary).
 *
 * - Finger: hold a chip still for a moment, then move. A quick tap never starts a drag, and
 *   moving straight away scrolls the list as normal.
 * - Mouse (laptop): press and move a few pixels.
 *
 * Drop targets are elements with a `data-drop` attribute ("pool" or a team id).
 */
const HOLD_MS = 280
const TOUCH_SLOP = 8
const MOUSE_SLOP = 5

export interface DragView {
  no: number
  x: number
  y: number
  over: string | null
}

function targetAt(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y)?.closest('[data-drop]')
  return el ? el.getAttribute('data-drop') : null
}

export function useChipDrag(onDrop: (no: number, target: string) => void) {
  const [drag, setDrag] = useState<DragView | null>(null)
  const pending = useRef<{ no: number; x: number; y: number; id: number; mouse: boolean; timer?: ReturnType<typeof setTimeout> } | null>(null)
  const active = useRef<DragView | null>(null)
  const justDragged = useRef(false)
  const dropRef = useRef(onDrop)
  useEffect(() => {
    dropRef.current = onDrop
  }, [onDrop])

  const begin = useCallback((x: number, y: number) => {
    const p = pending.current
    if (!p) return
    active.current = { no: p.no, x, y, over: targetAt(x, y) }
    setDrag(active.current)
  }, [])

  const reset = useCallback(() => {
    if (pending.current?.timer) clearTimeout(pending.current.timer)
    pending.current = null
    active.current = null
    setDrag(null)
  }, [])

  useEffect(() => {
    // Stop the page scrolling while a chip is being dragged (must be a non-passive listener)
    const blockScroll = (e: TouchEvent) => {
      if (active.current) e.preventDefault()
    }
    const move = (e: PointerEvent) => {
      if (active.current) {
        active.current = { ...active.current, x: e.clientX, y: e.clientY, over: targetAt(e.clientX, e.clientY) }
        setDrag(active.current)
        return
      }
      const p = pending.current
      if (!p || e.pointerId !== p.id) return
      const dist = Math.hypot(e.clientX - p.x, e.clientY - p.y)
      if (p.mouse && dist > MOUSE_SLOP) begin(e.clientX, e.clientY)
      else if (!p.mouse && dist > TOUCH_SLOP) reset() // finger moved before the hold: it's a scroll
    }
    const up = (e: PointerEvent) => {
      const d = active.current
      if (d) {
        const target = targetAt(e.clientX, e.clientY)
        justDragged.current = true
        setTimeout(() => (justDragged.current = false), 80) // swallow the click that follows
        if (target) dropRef.current(d.no, target)
      }
      reset()
    }
    document.addEventListener('touchmove', blockScroll, { passive: false })
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', reset)
    return () => {
      document.removeEventListener('touchmove', blockScroll)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', reset)
    }
  }, [begin, reset])

  /** Attach to a chip's onPointerDown. */
  const press = useCallback(
    (no: number, e: React.PointerEvent) => {
      if (e.button > 0) return
      const mouse = e.pointerType === 'mouse'
      pending.current = { no, x: e.clientX, y: e.clientY, id: e.pointerId, mouse }
      if (!mouse) pending.current.timer = setTimeout(() => begin(pending.current?.x ?? 0, pending.current?.y ?? 0), HOLD_MS)
    },
    [begin],
  )

  /** True for a moment after a drop, so the chip's click handler can ignore it. */
  const wasDrag = useCallback(() => justDragged.current, [])

  return { drag, press, wasDrag }
}

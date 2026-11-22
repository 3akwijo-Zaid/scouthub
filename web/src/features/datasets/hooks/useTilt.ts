import { useCallback, useRef, type PointerEvent } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

const MAX_TILT = 10 // degrees

/**
 * 3D tilt + light position that follow the mouse or the finger (pointer events cover both).
 * Writes CSS variables (--rx, --ry, --mx, --my) and data attributes read by .sh-card.
 */
export function useTilt<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const reduced = usePrefersReducedMotion()

  const move = useCallback((e: PointerEvent<T>) => {
    const el = ref.current
    if (!el || reduced) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    el.style.setProperty('--ry', `${(x - 0.5) * 2 * MAX_TILT}deg`)
    el.style.setProperty('--rx', `${(0.5 - y) * 2 * MAX_TILT}deg`)
    el.style.setProperty('--mx', `${x * 100}%`)
    el.style.setProperty('--my', `${y * 100}%`)
    el.dataset.active = 'true'
  }, [reduced])

  const reset = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
    el.dataset.active = 'false'
    el.dataset.pressed = 'false'
  }, [])

  const press = useCallback((e: PointerEvent<T>) => {
    const el = ref.current
    if (!el) return
    el.dataset.pressed = 'true'
    move(e)
  }, [move])

  const release = useCallback(() => {
    if (ref.current) ref.current.dataset.pressed = 'false'
  }, [])

  return {
    ref,
    handlers: {
      onPointerMove: move,
      onPointerEnter: move,
      onPointerLeave: reset,
      onPointerCancel: reset,
      onPointerDown: press,
      onPointerUp: release,
    },
  }
}

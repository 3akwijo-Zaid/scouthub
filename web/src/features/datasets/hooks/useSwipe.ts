import { useRef, type TouchEvent } from 'react'

const MIN_DISTANCE = 60 // px
const MAX_VERTICAL_RATIO = 0.6

/** Horizontal swipe with a finger: calls onLeft / onRight, ignores mostly-vertical scrolls. */
export function useSwipe(onLeft: () => void, onRight: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null)

  return {
    onTouchStart: (e: TouchEvent) => {
      const t = e.touches[0]
      start.current = { x: t.clientX, y: t.clientY }
    },
    onTouchEnd: (e: TouchEvent) => {
      if (!start.current) return
      const t = e.changedTouches[0]
      const dx = t.clientX - start.current.x
      const dy = t.clientY - start.current.y
      start.current = null
      if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dy) > Math.abs(dx) * MAX_VERTICAL_RATIO) return
      if (dx < 0) onLeft()
      else onRight()
    },
  }
}

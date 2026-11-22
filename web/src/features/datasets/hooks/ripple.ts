import type { PointerEvent } from 'react'

/** Adds an expanding dot where the element was clicked or tapped (element needs .sh-ripple). */
export function ripple(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget
  const rect = el.getBoundingClientRect()
  const dot = document.createElement('span')
  dot.className = 'sh-ripple-dot'
  dot.style.left = `${e.clientX - rect.left}px`
  dot.style.top = `${e.clientY - rect.top}px`
  el.appendChild(dot)
  dot.addEventListener('animationend', () => dot.remove(), { once: true })
}

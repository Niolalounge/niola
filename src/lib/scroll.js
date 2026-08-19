let smoothScroller = null

export function setSmoothScroller(instance) {
  smoothScroller = instance
}

export function clearSmoothScroller(instance) {
  if (smoothScroller === instance) smoothScroller = null
}

// Instant, Lenis-aware jump for functional UI (menu category switching).
export function scrollWindowTo(top) {
  if (smoothScroller) smoothScroller.scrollTo(top, { immediate: true, force: true })
  else window.scrollTo({ top, left: 0, behavior: 'auto' })
}

// Freeze/unfreeze the background without moving it (used by the mobile menu).
export function pauseSmoothScroller() {
  smoothScroller?.stop()
}

export function resumeSmoothScroller() {
  smoothScroller?.start()
}

import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { clearSmoothScroller, setSmoothScroller } from '../lib/scroll'

// Clearance below the fixed navbar. `scroll-margin-top` on the anchor stays the source of
// truth so CSS and JS can never drift apart; the live navbar height is the fallback.
function getAnchorOffset(target) {
  const declared = Number.parseFloat(window.getComputedStyle(target).scrollMarginTop)
  if (Number.isFinite(declared) && declared > 0) return declared
  const header = document.querySelector('.site-header')
  return (header?.offsetHeight ?? 92) + 20
}

function getAnchorTop(target) {
  return Math.max(0, target.getBoundingClientRect().top + window.scrollY - getAnchorOffset(target))
}

export default function ScrollManager() {
  const location = useLocation()
  const lenisRef = useRef(null)
  const isInitialRoute = useRef(true)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return undefined

    const lenis = new Lenis({
      lerp: 0.09,
      wheelMultiplier: 0.9,
      smoothWheel: true,
      syncTouch: false,
    })
    lenisRef.current = lenis
    setSmoothScroller(lenis)
    let frame

    const raf = (time) => {
      lenis.raf(time)
      frame = window.requestAnimationFrame(raf)
    }

    lenis.on('scroll', ScrollTrigger.update)
    frame = window.requestAnimationFrame(raf)

    return () => {
      window.cancelAnimationFrame(frame)
      lenis.destroy()
      if (lenisRef.current === lenis) lenisRef.current = null
      clearSmoothScroller(lenis)
    }
  }, [])

  useEffect(() => {
    let attempts = 0
    let frame
    let settleTimer
    let cancelled = false

    const jumpTo = (target) => {
      const root = document.documentElement
      const previousScrollBehavior = root.style.scrollBehavior
      root.style.scrollBehavior = 'auto'
      lenisRef.current?.stop()
      window.scrollTo(0, getAnchorTop(target))
      lenisRef.current?.start()
      window.requestAnimationFrame(() => {
        root.style.scrollBehavior = previousScrollBehavior
      })
    }

    // A deep link is measured before fonts/images settle, so correct it once they have.
    const correctAfterLoad = (target) => {
      const correct = () => {
        if (cancelled) return
        ScrollTrigger.refresh()
        jumpTo(target)
      }
      if (document.readyState === 'complete') settleTimer = window.setTimeout(correct, 150)
      else window.addEventListener('load', () => { settleTimer = window.setTimeout(correct, 150) }, { once: true })
    }

    const reachDestination = () => {
      const hashId = decodeURIComponent(location.hash.slice(1))

      // `#home` means the absolute top of the page, never a measured section offset — and
      // the menu page handles its own category hashes, so it always opens at the top too.
      if (!location.hash || hashId === 'home' || location.pathname === '/menu') {
        // `force` because the mobile menu pauses Lenis while it is open.
        if (lenisRef.current) lenisRef.current.scrollTo(0, { immediate: true, force: true })
        else window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
        isInitialRoute.current = false
        return
      }

      const target = document.getElementById(hashId)
      if (!target) {
        if (attempts < 120) {
          attempts += 1
          frame = window.requestAnimationFrame(reachDestination)
        }
        return
      }

      // Recalculate triggers *before* measuring, so the destination is never stale — and
      // never mid-flight, which used to leave the scroll parked between two sections.
      ScrollTrigger.refresh()
      // Lenis clamps every scrollTo to its cached scroll limit, and that cache is refreshed
      // by a *debounced* observer. Arriving from /menu or /gallery the limit is still the
      // one measured while the route was swapping, so deep sections clamped to 0.
      lenisRef.current?.resize()

      if (isInitialRoute.current) {
        jumpTo(target)
        correctAfterLoad(target)
      } else if (lenisRef.current) {
        // Scroll to a resolved position, never to the element: for element targets Lenis
        // subtracts scroll-margin-top *and* the root scroll-padding-top itself, which
        // stacked with our own offset and overshot the section by hundreds of pixels.
        // `force` is required because arriving from the mobile menu leaves Lenis paused,
        // and a paused Lenis drops scrollTo silently.
        lenisRef.current.scrollTo(getAnchorTop(target), {
          duration: 0.8,
          force: true,
        })
      } else {
        // Reduced motion: same destination, no animation.
        window.scrollTo({ top: getAnchorTop(target), left: 0, behavior: 'auto' })
      }
      isInitialRoute.current = false
    }

    frame = window.requestAnimationFrame(reachDestination)
    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
      window.clearTimeout(settleTimer)
    }
  }, [location.pathname, location.hash])

  return null
}

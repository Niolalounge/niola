import { useEffect, useRef, useState } from 'react'

const DESKTOP_FALLBACK = '/images/interior/Desktop_Hero.png'
const MOBILE_FALLBACK = '/images/interior/Mobile_Hero.png'
const DESKTOP_VIDEO = '/images/interior/Hero_Video.mp4'
const MOBILE_VIDEO = '/images/interior/MOBILE_HERO_VIDEO.mp4'

export function useHeroVideoFallback() {
  const videoRef = useRef(null)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 767px)').matches
      : false,
  )
  const [videoState, setVideoState] = useState('pending')

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)')
    const handleViewportChange = (event) => setIsMobile(event.matches)
    query.addEventListener('change', handleViewportChange)
    return () => query.removeEventListener('change', handleViewportChange)
  }, [])

  const videoSource = isMobile ? MOBILE_VIDEO : DESKTOP_VIDEO

  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined

    setVideoState('pending')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion) {
      setVideoState('fallback')
      return undefined
    }

    let disposed = false
    const showFallback = () => {
      if (!disposed) setVideoState('fallback')
    }
    const showVideo = () => {
      if (!disposed) setVideoState('playing')
    }
    const attemptPlayback = async () => {
      try {
        await video.play()
        showVideo()
      } catch {
        showFallback()
      }
    }

    video.addEventListener('playing', showVideo)
    video.addEventListener('error', showFallback)
    video.addEventListener('abort', showFallback)
    video.addEventListener('stalled', showFallback)

    if (video.readyState >= 2) {
      attemptPlayback()
    } else {
      video.addEventListener('loadeddata', attemptPlayback, { once: true })
    }

    const safetyTimer = window.setTimeout(() => {
      if (!video.paused && video.currentTime >= 0) showVideo()
      else showFallback()
    }, 3500)

    return () => {
      disposed = true
      window.clearTimeout(safetyTimer)
      video.removeEventListener('playing', showVideo)
      video.removeEventListener('error', showFallback)
      video.removeEventListener('abort', showFallback)
      video.removeEventListener('stalled', showFallback)
      video.removeEventListener('loadeddata', attemptPlayback)
    }
    // Re-runs when the viewport swaps the mobile/desktop source.
  }, [videoSource])

  return {
    videoRef,
    videoState,
    videoSource,
    fallbackImage: isMobile ? MOBILE_FALLBACK : DESKTOP_FALLBACK,
    isMobile,
  }
}

import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import ArrowIcon from './ArrowIcon'
import { useHeroVideoFallback } from '../hooks/useHeroVideoFallback'
import { useLanguage } from '../hooks/useLanguage'

gsap.registerPlugin(ScrollTrigger)

export default function Hero() {
  const sectionRef = useRef(null)
  const { copy } = useLanguage()
  const { videoRef, videoState, videoSource, fallbackImage } = useHeroVideoFallback()

  useLayoutEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return undefined

    const context = gsap.context(() => {
      const mediaQuery = gsap.matchMedia()

      mediaQuery.add('(min-width: 769px)', () => {
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.9,
          },
        })

        timeline
          .to('.hero__media-layer', { scale: 1.12, yPercent: 5, ease: 'none' }, 0)
          .to('.hero__veil', { opacity: 0.78, ease: 'none' }, 0)
          .to('.hero__content', { yPercent: -22, opacity: 0.18, ease: 'none' }, 0)
          .to('.hero__depth-frame', { scale: 0.96, yPercent: 7, ease: 'none' }, 0)

        return () => timeline.kill()
      })

      return () => mediaQuery.revert()
    }, sectionRef)

    return () => context.revert()
  }, [])

  return (
    <section ref={sectionRef} id="home" className="hero-scene" aria-label={copy.a11y.heroMedia}>
      <div className="hero__depth-frame">
        <div className="hero__media-layer" data-video-state={videoState}>
          <img
            className="hero__fallback"
            src={fallbackImage}
            alt=""
            width="1536"
            height="1024"
            fetchPriority="high"
          />
          <video
            key={videoSource}
            ref={videoRef}
            className="hero__video"
            src={videoSource}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={fallbackImage}
            aria-hidden="true"
          />
          <div className="hero__veil" />
          <div className="hero__grain" />
        </div>
      </div>

      <div className="hero__content shell">
        <p className="eyebrow hero__eyebrow"><span />{copy.hero.eyebrow}</p>
        <h1>
          <span>{copy.hero.titleLineOne}</span>
          <span>{copy.hero.titleLineTwo}</span>
        </h1>
        <p className="hero__supporting">
          {copy.hero.supportingLineOne}
          <br />
          {copy.hero.supportingLineTwo}
        </p>
        <Link className="outline-button" to="/menu">
          <span>{copy.hero.menuCta}</span>
          <ArrowIcon />
        </Link>
      </div>

      <a className="hero__scroll" href="#about" aria-label={copy.a11y.scrollToSection}>
        <span>{copy.hero.scrollHint}</span>
        <i />
      </a>

      <div className="hero__scene-number" aria-hidden="true">
        <span>01</span>
        <i />
        <span>NIOLA</span>
      </div>
    </section>
  )
}

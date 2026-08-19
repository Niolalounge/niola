import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLanguage } from '../hooks/useLanguage'

gsap.registerPlugin(ScrollTrigger)

export default function NileSection() {
  const sectionRef = useRef(null)
  const { copy } = useLanguage()

  useLayoutEffect(() => {
    const context = gsap.context(() => {
      const query = gsap.matchMedia()

      query.add('(min-width: 769px) and (prefers-reduced-motion: no-preference)', () => {
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1,
          },
        })
        timeline
          .fromTo('.nile-scene__image', { scale: 1.14, yPercent: -2 }, { scale: 1.02, yPercent: 2, ease: 'none' }, 0)
          .fromTo('.nile-scene__title span', { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.08, ease: 'power2.out' }, 0.12)
          .fromTo('.nile-scene__rule', { scaleX: 0 }, { scaleX: 1, ease: 'none' }, 0.2)
        return () => timeline.kill()
      })

      // Phones: no pinning, no perspective, no horizontal movement — a light reveal on
      // entry plus a small vertical parallax while the section passes through.
      query.add('(max-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
        const reveal = gsap.timeline({
          scrollTrigger: { trigger: sectionRef.current, start: 'top 78%', once: true },
        })
        reveal
          // Scale only — the scrubbed parallax below owns `y`, so they never fight.
          .fromTo('.nile-scene__image', { scale: 1.06 }, { scale: 1, duration: 1.3, ease: 'power2.out' }, 0)
          .fromTo('.nile-scene__content .eyebrow', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0.1)
          .fromTo('.nile-scene__title', { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out' }, 0.28)
          .fromTo('.nile-scene__rule', { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'power2.out' }, 0.5)

        // 26px of travel, covered by the 3% vertical bleed so no edge is ever exposed.
        const parallax = gsap.fromTo(
          '.nile-scene__image',
          { y: -13 },
          {
            y: 13,
            ease: 'none',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1,
            },
          },
        )

        return () => {
          reveal.kill()
          parallax.kill()
        }
      })

      // Reduced motion: opacity only, nothing moves or scales.
      query.add('(prefers-reduced-motion: reduce)', () => {
        const fade = gsap.fromTo(
          ['.nile-scene__content .eyebrow', '.nile-scene__title', '.nile-scene__rule'],
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.5,
            stagger: 0.08,
            scrollTrigger: { trigger: sectionRef.current, start: 'top 80%', once: true },
          },
        )
        return () => fade.kill()
      })

      return () => query.revert()
    }, sectionRef)

    return () => context.revert()
  }, [])

  return (
    <section ref={sectionRef} id="nile" className="nile-scene" aria-label={copy.a11y.nileScene}>
      <div className="nile-scene__sticky">
        <picture>
          <source
            media="(max-width: 767px)"
            srcSet="/images/interior/Niola_MOBILE_NILE_VIEW.png"
            width="853"
            height="1844"
          />
          <img
            className="nile-scene__image"
            src="/images/interior/Niola_NILE_VIEW.jpeg"
            alt={copy.nile.imageAlt}
            width="1408"
            height="1117"
            loading="lazy"
          />
        </picture>
        <div className="nile-scene__overlay" />
        <div className="nile-scene__content shell">
          <p className="eyebrow">{copy.nile.eyebrow}</p>
          <h2 className="nile-scene__title">
            <span>{copy.nile.titleLineOne}</span>
            <span>{copy.nile.titleLineTwo}</span>
          </h2>
          <span className="nile-scene__rule" />
        </div>
        <div className="nile-scene__coordinates" dir="ltr" aria-hidden="true">
          30.0444° N<br />31.2357° E
        </div>
      </div>
    </section>
  )
}

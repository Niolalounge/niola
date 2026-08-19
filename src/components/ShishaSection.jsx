import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import ArrowIcon from './ArrowIcon'
import { useLanguage } from '../hooks/useLanguage'

gsap.registerPlugin(ScrollTrigger)

export default function ShishaSection() {
  const sectionRef = useRef(null)
  const { copy } = useLanguage()

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const context = gsap.context(() => {
      const mediaQuery = gsap.matchMedia()

      gsap.from('.shisha__media', {
        clipPath: 'inset(0 0 0 100%)',
        duration: 1.25,
        ease: 'power4.inOut',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 72%', once: true },
      })

      // The copy reveal slides horizontally on desktop only. On phones that offset pushed
      // the column past the viewport edge until the trigger fired, so it reveals vertically.
      mediaQuery.add('(min-width: 769px)', () => {
        const tween = gsap.from('.shisha__copy > *', {
          x: 45,
          opacity: 0,
          stagger: 0.12,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.shisha__copy', start: 'top 75%', once: true },
        })
        return () => tween.kill()
      })

      mediaQuery.add('(max-width: 768px)', () => {
        const tween = gsap.from('.shisha__copy > *', {
          y: 28,
          opacity: 0,
          stagger: 0.1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.shisha__copy', start: 'top 82%', once: true },
        })
        return () => tween.kill()
      })

      gsap.to('.shisha__media img', {
        scale: 1.08,
        ease: 'none',
        scrollTrigger: { trigger: sectionRef.current, start: 'top bottom', end: 'bottom top', scrub: 1 },
      })

      return () => mediaQuery.revert()
    }, sectionRef)
    return () => context.revert()
  }, [])

  return (
    <section ref={sectionRef} className="shisha section-pad">
      <div id="shisha" className="shell shisha__layout">
        <div className="shisha__media">
          <img
            src="/images/shisha/Shisha masul.png"
            alt={copy.shisha.imageAlt}
            width="1535"
            height="1024"
            loading="lazy"
          />
          <span className="shisha__media-label">NIOLA · EVENING</span>
        </div>
        <div className="shisha__copy">
          <p className="eyebrow">{copy.shisha.eyebrow}</p>
          <h2 className="display-heading">
            <span>{copy.shisha.titleLineOne}</span>
            <span>{copy.shisha.titleLineTwo}</span>
          </h2>
          <p>{copy.shisha.description}</p>
          <Link className="text-link" to="/menu#shisha">
            {copy.shisha.cta}<ArrowIcon />
          </Link>
        </div>
      </div>
    </section>
  )
}

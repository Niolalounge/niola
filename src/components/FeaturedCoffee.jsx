import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import ArrowIcon from './ArrowIcon'
import { useLanguage } from '../hooks/useLanguage'

gsap.registerPlugin(ScrollTrigger)

export default function FeaturedCoffee() {
  const sectionRef = useRef(null)
  const { copy } = useLanguage()

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const context = gsap.context(() => {
      gsap.from('.featured-coffee__image-main', {
        clipPath: 'inset(0 100% 0 0)',
        duration: 1.25,
        ease: 'power4.inOut',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 72%', once: true },
      })
      gsap.from('.featured-coffee__product', {
        scale: 0.78,
        rotate: -7,
        y: 70,
        opacity: 0,
        duration: 1.1,
        ease: 'back.out(1.3)',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 66%', once: true },
      })
      gsap.to('.featured-coffee__product', {
        yPercent: -14,
        rotate: 2,
        ease: 'none',
        scrollTrigger: { trigger: sectionRef.current, start: 'top bottom', end: 'bottom top', scrub: 1 },
      })
    }, sectionRef)

    return () => context.revert()
  }, [])

  return (
    <section ref={sectionRef} className="featured-coffee section-pad">
      <div className="shell featured-coffee__layout">
        <div className="featured-coffee__visual">
          <div className="featured-coffee__image-main">
            <img
              src="/images/gallary/Niola_Coffee.png"
              alt={copy.featuredCoffee.imageAlt}
              width="1220"
              height="1289"
              loading="lazy"
            />
          </div>
          <div className="featured-coffee__product">
            <img
              src="/images/special coffee/200 v60.png"
              alt="V60"
              width="1254"
              height="1254"
              loading="lazy"
            />
            <span>V60 · NIOLA</span>
          </div>
          <span className="featured-coffee__line" aria-hidden="true" />
        </div>

        <div className="featured-coffee__copy">
          <p className="eyebrow eyebrow--dark">{copy.featuredCoffee.eyebrow}</p>
          <h2 className="display-heading display-heading--dark">{copy.featuredCoffee.title}</h2>
          <p>{copy.featuredCoffee.description}</p>
          <Link className="text-link text-link--dark" to="/menu#coffee">
            {copy.featuredCoffee.cta}<ArrowIcon />
          </Link>
          <div className="featured-coffee__seal" aria-hidden="true">
            <span>NIOLA</span><i /> <span>CAIRO · 2026</span>
          </div>
        </div>
      </div>
    </section>
  )
}

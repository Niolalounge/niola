import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import ArrowIcon from './ArrowIcon'
import { useLanguage } from '../hooks/useLanguage'

gsap.registerPlugin(ScrollTrigger)

const atmosphereImages = [
  {
    src: '/images/interior/luxurious_atmosphere.png',
    width: 1204,
    height: 1306,
    crop: 'lounge',
  },
  {
    src: '/images/gallary/A view of the Nile.jpeg',
    width: 1536,
    height: 864,
    crop: 'nile',
  },
  {
    src: '/images/interior/Special_Times.png',
    width: 1254,
    height: 1254,
    crop: 'seating',
  },
]

const parallaxOffsets = [-5, -3, -6]

function AtmosphereIcon({ index }) {
  const paths = [
    <>
      <path d="M12 3c.6 4.7 2.3 6.4 7 7-4.7.6-6.4 2.3-7 7-.6-4.7-2.3-6.4-7-7 4.7-.6 6.4-2.3 7-7Z" />
      <path d="M5 3v4M3 5h4" />
    </>,
    <>
      <path d="M3 8.5c2.4-1.8 4.8-1.8 7.2 0s4.8 1.8 7.2 0 3.6-1.8 3.6-1.8" />
      <path d="M3 13c2.4-1.8 4.8-1.8 7.2 0s4.8 1.8 7.2 0 3.6-1.8 3.6-1.8" />
      <path d="M3 17.5c2.4-1.8 4.8-1.8 7.2 0s4.8 1.8 7.2 0 3.6-1.8 3.6-1.8" />
    </>,
    <>
      <path d="M6 18v-6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6" />
      <path d="M4 14h16v4H4zM7 18v3M17 18v3" />
    </>,
  ]

  return (
    <span className="atmosphere-card__icon" aria-hidden="true">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <g stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round">
          {paths[index]}
        </g>
      </svg>
    </span>
  )
}

export default function AtmosphereSection() {
  const sectionRef = useRef(null)
  const { copy } = useLanguage()

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const context = gsap.context(() => {
      gsap.from('.atmosphere__copy > *', {
        y: 42,
        opacity: 0,
        duration: 1,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.atmosphere__copy',
          start: 'top 78%',
          once: true,
        },
      })

      gsap.utils.toArray('.atmosphere-card').forEach((card, index) => {
        gsap.from(card, {
          y: 70 + index * 28,
          rotateX: 5 + index * 1.5,
          opacity: 0,
          duration: 1.15,
          delay: index * 0.1,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
          scrollTrigger: { trigger: card, start: 'top 88%', once: true },
        })
        gsap.to(card.querySelector('img'), {
          yPercent: parallaxOffsets[index],
          ease: 'none',
          scrollTrigger: {
            trigger: card,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        })
      })
    }, sectionRef)

    return () => context.revert()
  }, [])

  return (
    <section ref={sectionRef} id="about" className="atmosphere section-pad">
      <div className="atmosphere__glow" aria-hidden="true" />
      <div className="shell atmosphere__layout">
        <div className="atmosphere__copy">
          <p className="eyebrow">{copy.atmosphere.eyebrow}</p>
          <h2 className="display-heading">
            <span>{copy.atmosphere.titleLineOne}</span>
            <span>{copy.atmosphere.titleLineTwo}</span>
          </h2>
          <a className="text-link" href="#gallery">
            {copy.atmosphere.cta}
            <ArrowIcon />
          </a>
        </div>

        <div id="gallery" className="atmosphere__gallery" aria-label={copy.a11y.atmosphereGallery}>
          {copy.atmosphere.cards.map((card, index) => {
            const image = atmosphereImages[index]

            return (
              <article className="atmosphere-card" key={card.title}>
                <div className="atmosphere-card__media">
                  <img
                    className={`atmosphere-card__image atmosphere-card__image--${image.crop}`}
                    src={image.src}
                    alt={card.alt}
                    width={image.width}
                    height={image.height}
                    loading="lazy"
                  />
                  <div className="atmosphere-card__shade" />
                </div>
                <div className="atmosphere-card__content">
                  <AtmosphereIcon index={index} />
                  <div>
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                  </div>
                  <ArrowIcon />
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import ArrowIcon from '../components/ArrowIcon'
import { useLanguage } from '../hooks/useLanguage'

gsap.registerPlugin(ScrollTrigger)

const galleryItems = [
  {
    key: 'nileView',
    layout: 'nile-view',
    src: '/images/gallary/A view of the Nile.jpeg',
    width: 1536,
    height: 864,
    objectPosition: '50% 50%',
  },
  {
    key: 'luxuriousAtmosphere',
    layout: 'luxurious-atmosphere',
    src: '/images/gallary/luxurious_atmosphere.png',
    width: 1204,
    height: 1306,
    objectPosition: '52% 58%',
  },
  {
    key: 'niolaCoffee',
    layout: 'niola-coffee',
    src: '/images/gallary/Niola_Coffee.png',
    width: 1220,
    height: 1289,
    objectPosition: '49% 56%',
  },
  {
    key: 'niolaDayOut',
    layout: 'niola-dayout',
    src: '/images/gallary/Niola_DAYOUT.png',
    width: 941,
    height: 1672,
    objectPosition: '50% 44%',
  },
  {
    key: 'niolaNile',
    layout: 'niola-nile',
    src: '/images/gallary/Niola_Nile.png',
    width: 941,
    height: 1672,
    objectPosition: '50% 48%',
  },
  {
    key: 'specialTimes',
    layout: 'special-times',
    src: '/images/gallary/Special_Times.png',
    width: 1254,
    height: 1254,
    objectPosition: '56% 68%',
  },
]

export default function Gallery() {
  const pageRef = useRef(null)
  const lightboxRef = useRef(null)
  const closeButtonRef = useRef(null)
  const lastFocusedRef = useRef(null)
  const touchOriginRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(null)
  const { copy, direction, language } = useLanguage()
  const lightboxOpen = activeIndex !== null

  const closeLightbox = useCallback(() => setActiveIndex(null), [])
  const showPrevious = useCallback(() => {
    setActiveIndex((current) => (
      current === null ? 0 : (current - 1 + galleryItems.length) % galleryItems.length
    ))
  }, [])
  const showNext = useCallback(() => {
    setActiveIndex((current) => (
      current === null ? 0 : (current + 1) % galleryItems.length
    ))
  }, [])

  const openLightbox = (index) => {
    lastFocusedRef.current = document.activeElement
    setActiveIndex(index)
  }

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const context = gsap.context(() => {
      gsap.from('.gallery-intro__content > *', {
        y: 24,
        autoAlpha: 0,
        duration: 0.85,
        stagger: 0.08,
        ease: 'power3.out',
      })

      gsap.utils.toArray('.gallery-card').forEach((card, index) => {
        const fromTop = index % 3 === 1
        gsap.fromTo(
          card,
          {
            autoAlpha: 0,
            y: index % 2 === 0 ? 46 : 64,
            scale: index === 0 ? 0.97 : 0.985,
            clipPath: fromTop
              ? 'inset(0 0 18% 0 round 18px)'
              : 'inset(12% 0 0 0 round 18px)',
          },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            clipPath: 'inset(0 0 0 0 round 18px)',
            duration: 0.95 + (index % 3) * 0.08,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 88%',
              once: true,
            },
            onComplete: () => {
              gsap.set(card, { clearProps: 'transform,opacity,visibility,clipPath' })
            },
          },
        )
      })
    }, pageRef)

    return () => context.revert()
  }, [language])

  useEffect(() => {
    if (!lightboxOpen) return undefined

    const root = document.documentElement
    root.classList.add('gallery-lightbox-open')
    document.body.classList.add('gallery-lightbox-open')

    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus())

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeLightbox()
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        if (direction === 'rtl') showNext()
        else showPrevious()
        return
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        if (direction === 'rtl') showPrevious()
        else showNext()
        return
      }

      if (event.key !== 'Tab') return

      const focusable = lightboxRef.current?.querySelectorAll('button:not([disabled])')
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener('keydown', handleKeyDown)
      root.classList.remove('gallery-lightbox-open')
      document.body.classList.remove('gallery-lightbox-open')
      lastFocusedRef.current?.focus()
    }
  }, [closeLightbox, direction, lightboxOpen, showNext, showPrevious])

  const handleTouchStart = (event) => {
    const touch = event.changedTouches[0]
    touchOriginRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (event) => {
    if (!touchOriginRef.current) return
    const touch = event.changedTouches[0]
    const distanceX = touch.clientX - touchOriginRef.current.x
    const distanceY = touch.clientY - touchOriginRef.current.y
    touchOriginRef.current = null

    if (Math.abs(distanceX) < 52 || Math.abs(distanceX) <= Math.abs(distanceY)) return

    const swipedTowardStart = distanceX > 0
    if (direction === 'rtl') {
      if (swipedTowardStart) showNext()
      else showPrevious()
    } else if (swipedTowardStart) {
      showPrevious()
    } else {
      showNext()
    }
  }

  const renderCard = (item, index) => {
    const itemCopy = copy.gallery.items[item.key]
    return (
      <button
        key={item.key}
        type="button"
        className={`gallery-card gallery-card--${item.layout}`}
        style={{
          '--gallery-aspect': `${item.width} / ${item.height}`,
          '--gallery-object-position': item.objectPosition,
        }}
        onClick={() => openLightbox(index)}
        aria-label={`${copy.a11y.openGalleryImage}: ${itemCopy.label}`}
        aria-haspopup="dialog"
      >
        <span className="gallery-card__media">
          <img
            src={item.src}
            width={item.width}
            height={item.height}
            alt={itemCopy.alt}
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={index === 0 ? 'high' : undefined}
          />
        </span>
        <span className="gallery-card__shade" aria-hidden="true" />
        <span className="gallery-card__label">{itemCopy.label}</span>
      </button>
    )
  }

  const activeItem = activeIndex === null ? null : galleryItems[activeIndex]
  const activeItemCopy = activeItem ? copy.gallery.items[activeItem.key] : null
  const counter = activeIndex === null
    ? ''
    : copy.gallery.lightbox.counter
      .replace('{current}', String(activeIndex + 1))
      .replace('{total}', String(galleryItems.length))

  return (
    <div ref={pageRef} id="gallery-page" className="page gallery-page" aria-label={copy.a11y.galleryPage}>
      <section className="gallery-intro" aria-labelledby="gallery-title">
        <div className="gallery-intro__content shell">
          <Link className="gallery-intro__back" to="/#home">
            <ArrowIcon />
            <span>{copy.gallery.backHome}</span>
          </Link>
          <p className="eyebrow">{copy.gallery.eyebrow}</p>
          <h1 id="gallery-title">{copy.gallery.title}</h1>
          <p className="gallery-intro__description">{copy.gallery.description}</p>
        </div>
        <span className="gallery-intro__index" aria-hidden="true">NIOLA / 06</span>
      </section>

      <section id="gallery-grid" className="gallery-showcase section-pad" aria-label={copy.a11y.galleryGrid}>
        <div className="gallery-editorial shell">
          <div className="gallery-editorial__lead">
            {galleryItems.slice(0, 2).map(renderCard)}
          </div>
          <div className="gallery-editorial__mosaic">
            {galleryItems.slice(2).map((item, index) => renderCard(item, index + 2))}
          </div>
        </div>
      </section>

      {lightboxOpen && activeItem && createPortal(
        <div
          ref={lightboxRef}
          className="gallery-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={copy.gallery.lightbox.dialogLabel}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeLightbox()
          }}
        >
          <button
            ref={closeButtonRef}
            type="button"
            className="gallery-lightbox__close"
            onClick={closeLightbox}
            aria-label={copy.a11y.closeGalleryLightbox}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <path d="M4 4l14 14M18 4 4 18" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>

          <button
            type="button"
            className="gallery-lightbox__control gallery-lightbox__previous"
            onClick={showPrevious}
            aria-label={copy.a11y.previousGalleryImage}
          >
            <ArrowIcon />
          </button>

          <figure
            className="gallery-lightbox__figure"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img
              key={activeItem.src}
              src={activeItem.src}
              width={activeItem.width}
              height={activeItem.height}
              alt={activeItemCopy.alt}
              decoding="async"
              draggable="false"
            />
            <figcaption>
              <span>{activeItemCopy.label}</span>
              <span className="gallery-lightbox__counter" aria-live="polite" dir="ltr">{counter}</span>
            </figcaption>
          </figure>

          <button
            type="button"
            className="gallery-lightbox__control gallery-lightbox__next"
            onClick={showNext}
            aria-label={copy.a11y.nextGalleryImage}
          >
            <ArrowIcon />
          </button>
        </div>,
        document.body,
      )}
    </div>
  )
}

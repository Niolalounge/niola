import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import ArrowIcon from './ArrowIcon'
import { useContent } from '../hooks/useContent'
import { useLanguage } from '../hooks/useLanguage'

gsap.registerPlugin(ScrollTrigger)

export default function MenuCategories() {
  const sectionRef = useRef(null)
  const { copy, language } = useLanguage()
  const { homeTiles } = useContent()

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const context = gsap.context(() => {
      gsap.from('.menu-categories__heading > *', {
        y: 45,
        opacity: 0,
        stagger: 0.12,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.menu-categories__heading', start: 'top 82%', once: true },
      })

      gsap.from('.category-card', {
        clipPath: 'inset(100% 0% 0% 0%)',
        y: 35,
        duration: 1.05,
        stagger: { each: 0.07, from: 'start' },
        ease: 'power3.inOut',
        scrollTrigger: { trigger: '.category-grid', start: 'top 82%', once: true },
      })
    }, sectionRef)

    return () => context.revert()
  }, [])

  return (
    <section ref={sectionRef} id="menu-categories" className="menu-categories section-pad">
      <div className="shell">
        <header className="menu-categories__heading">
          <div>
            <p className="eyebrow eyebrow--dark">{copy.menu.eyebrow}</p>
            <h2 className="display-heading display-heading--dark">{copy.menu.title}</h2>
          </div>
          <div>
            <p>{copy.menu.description}</p>
            <Link className="text-link text-link--dark" to="/menu">
              {copy.menu.fullMenuCta}<ArrowIcon />
            </Link>
          </div>
        </header>

        <div className="category-grid" aria-label={copy.a11y.menuCategories}>
          {homeTiles.map((category, index) => (
            <Link
              key={category.slug}
              to={`/menu#${category.slug}`}
              className="category-card"
              style={{ '--category-index': index }}
            >
              <img
                src={category.image}
                alt={`${category.name[language]} — ${copy.a11y.productImage}`}
                width="1200"
                height="1400"
                loading="lazy"
              />
              <div className="category-card__veil" />
              <div className="category-card__number">{String(index + 1).padStart(2, '0')}</div>
              <div className="category-card__content">
                <div>
                  <h3>{category.name[language]}</h3>
                  <p>{category.subtitle[language]}</p>
                </div>
                <span className="category-card__arrow"><ArrowIcon /></span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

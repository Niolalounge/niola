import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import ArrowIcon from '../components/ArrowIcon'
import { scrollWindowTo } from '../lib/scroll'
import { useContent } from '../hooks/useContent'
import { useLanguage } from '../hooks/useLanguage'

function readCategoryFromHash(categories) {
  if (typeof window === 'undefined') return null

  const raw = window.location.hash.slice(1)
  let slug
  try {
    slug = decodeURIComponent(raw)
  } catch {
    // A fragment mangled in transit — "#50%" — makes decodeURIComponent throw. This runs during
    // render, so an unguarded throw takes the whole page down rather than just missing a tab.
    slug = raw
  }

  return categories.some((category) => category.slug === slug) ? slug : null
}

export default function Menu() {
  const { copy, language } = useLanguage()
  const { categories } = useContent()
  const { key: locationKey } = useLocation()
  // Falls back to the first category on the very first render too: the section below already
  // renders categories[0] when nothing is selected, so leaving this null highlighted no tab
  // until the effect ran.
  const [activeCategory, setActiveCategory] = useState(
    () => readCategoryFromHash(categories) ?? categories[0]?.slug ?? null,
  )
  const categoryTrackRef = useRef(null)

  const defaultCategory = categories[0]?.slug
  const category = useMemo(
    () => categories.find((item) => item.slug === activeCategory) ?? categories[0],
    [categories, activeCategory],
  )
  const categoryIndex = categories.indexOf(category)

  // Deep links (/menu#tea) open the requested category directly; plain /menu opens the first one.
  useEffect(() => {
    setActiveCategory(readCategoryFromHash(categories) ?? defaultCategory)
  }, [categories, defaultCategory, locationKey])

  useEffect(() => {
    const syncFromHash = () => {
      const requested = readCategoryFromHash(categories)
      if (requested) setActiveCategory(requested)
    }
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [categories])

  // Keep the active tab visible inside the horizontal track without moving the page.
  useEffect(() => {
    const track = categoryTrackRef.current
    const activeLink = track?.querySelector(`[data-category-link="${activeCategory}"]`)
    if (!track || !activeLink) return
    if (track.scrollWidth <= track.clientWidth + 1) return

    const trackRect = track.getBoundingClientRect()
    const linkRect = activeLink.getBoundingClientRect()
    const delta = (linkRect.left + linkRect.width / 2) - (trackRect.left + trackRect.width / 2)
    if (Math.abs(delta) < 2) return

    track.scrollBy({
      left: delta,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }, [activeCategory])

  // The menu content starts at the top of the page, so switching returns there instantly.
  const alignToMenuTop = useCallback(() => {
    if (window.scrollY > 0) scrollWindowTo(0)
  }, [])

  const handleCategoryClick = (event, slug) => {
    event.preventDefault()
    setActiveCategory(slug)
    if (window.location.hash.slice(1) !== slug) {
      // Preserve the existing entry state: react-router keeps its own bookkeeping there
      // ({ usr, key, idx }), and replacing it with null breaks back/forward navigation.
      window.history.replaceState(window.history.state, '', `#${slug}`)
    }
    alignToMenuTop()
  }

  const formatPrice = (price) => `${new Intl.NumberFormat('en-US').format(price)} ${copy.menu.currency}`

  if (!category) return null

  return (
    <div className="page menu-page">
      <nav className="menu-category-nav" aria-label={copy.menu.categoryNavLabel}>
        <div ref={categoryTrackRef} className="shell menu-category-nav__track">
          {categories.map((item) => (
            <a
              key={item.slug}
              href={`#${item.slug}`}
              data-category-link={item.slug}
              className={activeCategory === item.slug ? 'is-active' : undefined}
              aria-current={activeCategory === item.slug ? 'location' : undefined}
              onClick={(event) => handleCategoryClick(event, item.slug)}
            >
              {item.name[language]}
            </a>
          ))}
        </div>
      </nav>

      <div className="menu-sections">
        <section
          id={category.slug}
          className="menu-section section-pad"
          data-category={category.slug}
          key={category.slug}
        >
          <div className="shell">
            <header className="menu-section__header">
              <div>
                <p className="eyebrow eyebrow--dark">NIOLA · {String(categoryIndex + 1).padStart(2, '0')}</p>
                <h2>{category.name[language]}</h2>
              </div>
              <div className="menu-section__meta">
                <p>{category.subtitle[language]}</p>
                <span>{String(category.products.length).padStart(2, '0')}</span>
              </div>
            </header>

            <ul className="menu-product-grid">
              {category.products.map((item) => (
                <li className="menu-product-card" key={item.slug}>
                  <div className="menu-product-card__media">
                    <img
                      src={item.image}
                      alt={`${item.name[language]} — ${copy.a11y.productImage}`}
                      width={item.imageWidth}
                      height={item.imageHeight}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="menu-product-card__body">
                    <h3>{item.name[language]}</h3>
                    <span>{formatPrice(item.price)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <section className="menu-return">
        <div className="shell">
          <p>NIOLA · ZAMALEK</p>
          <Link className="outline-button" to="/#location">
            {copy.location.title}<ArrowIcon />
          </Link>
        </div>
      </section>
    </div>
  )
}

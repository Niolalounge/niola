import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import ArrowIcon from '../components/ArrowIcon'
import { menuCategories } from '../data/menuData'
import { scrollWindowTo } from '../lib/scroll'
import { useLanguage } from '../hooks/useLanguage'

const preferredOrder = [
  'coffee',
  'specialty-coffee',
  'iced-drinks',
  'hot-drinks',
  'tea',
  'fresh-juices',
  'smoothies',
  'milkshakes',
  'desserts',
  'shisha',
]

const translationCategoryKey = {
  coffee: 'coffee',
  'specialty-coffee': 'specialtyCoffee',
  'iced-drinks': 'icedCoffee',
  'hot-drinks': 'hotDrinks',
  tea: 'tea',
  'fresh-juices': 'freshJuices',
  smoothies: 'smoothies',
  milkshakes: 'milkshakes',
  desserts: 'desserts',
  shisha: 'shisha',
}

const categoryImageDimensions = {
  coffee: [1254, 1254],
  'specialty-coffee': [1254, 1254],
  'iced-drinks': [1198, 1313],
  'hot-drinks': [1254, 1254],
  tea: [1402, 1122],
  'fresh-juices': [1122, 1402],
  smoothies: [1537, 1023],
  milkshakes: [1122, 1402],
  desserts: [1536, 1024],
  shisha: [1254, 1254],
}

const productImageDimensionOverrides = {
  'fresh-juices/avocado-juice': [1086, 1448],
  'fresh-juices/watermelon-juice': [1086, 1448],
  'fresh-juices/guava-juice': [1145, 1373],
  'fresh-juices/layered-juice': [1149, 1369],
  'iced-drinks/iced-matcha-latte': [1086, 1448],
  'iced-drinks/iced-nutella': [1197, 1314],
  'iced-drinks/iced-lotus-latte': [1122, 1402],
  'iced-drinks/iced-white-mocha': [1086, 1448],
  'iced-drinks/iced-blue-latte': [1086, 1448],
  'milkshakes/vanilla-milkshake': [1179, 1334],
  'milkshakes/pistachio-milkshake': [1123, 1401],
  'hot-drinks/hot-chocolate': [1402, 1122],
  'hot-drinks/hot-tiramisu': [1448, 1086],
  'shisha/shisha': [1122, 1402],
  'shisha/salloum-shisha': [1535, 1024],
}

const categories = preferredOrder
  .map((slug) => menuCategories.find((category) => category.slug === slug))
  .filter(Boolean)
  .map((category) => ({
    ...category,
    products: category.products.filter((item) => item.image && item.slug !== 'red-tea-pot'),
  }))
  .filter((category) => category.products.length > 0)

const defaultCategory = categories[0]?.slug ?? 'coffee'

function getProductImageDimensions(categorySlug, productSlug) {
  return productImageDimensionOverrides[`${categorySlug}/${productSlug}`]
    ?? categoryImageDimensions[categorySlug]
}

function readCategoryFromHash() {
  if (typeof window === 'undefined') return null
  const slug = decodeURIComponent(window.location.hash.slice(1))
  return categories.some((category) => category.slug === slug) ? slug : null
}

export default function Menu() {
  const { copy, language } = useLanguage()
  const { key: locationKey } = useLocation()
  const [activeCategory, setActiveCategory] = useState(() => readCategoryFromHash() ?? defaultCategory)
  const categoryTrackRef = useRef(null)

  const category = categories.find((item) => item.slug === activeCategory) ?? categories[0]
  const categoryIndex = categories.indexOf(category)

  // Deep links (/menu#tea) open the requested category directly; plain /menu opens the first one.
  useEffect(() => {
    setActiveCategory(readCategoryFromHash() ?? defaultCategory)
  }, [locationKey])

  useEffect(() => {
    const syncFromHash = () => {
      const requested = readCategoryFromHash()
      if (requested) setActiveCategory(requested)
    }
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

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
      window.history.replaceState(null, '', `#${slug}`)
    }
    alignToMenuTop()
  }

  const formatPrice = (price) => `${new Intl.NumberFormat('en-US').format(price)} ${copy.menu.currency}`

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
                <p>{copy.menu.categorySubtitles[translationCategoryKey[category.slug]]}</p>
                <span>{String(category.products.length).padStart(2, '0')}</span>
              </div>
            </header>

            <ul className="menu-product-grid">
              {category.products.map((item) => {
                const [imageWidth, imageHeight] = getProductImageDimensions(category.slug, item.slug)

                return (
                  <li className="menu-product-card" key={item.slug}>
                    <div className="menu-product-card__media">
                      <img
                        src={item.image}
                        alt={`${item.name[language]} — ${copy.a11y.productImage}`}
                        width={imageWidth}
                        height={imageHeight}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <div className="menu-product-card__body">
                      <h3>{item.name[language]}</h3>
                      <span dir="ltr">{formatPrice(item.price)}</span>
                    </div>
                  </li>
                )
              })}
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

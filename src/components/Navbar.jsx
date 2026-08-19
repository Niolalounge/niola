import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import BrandLogo from './BrandLogo'
import LanguageSwitcher from './LanguageSwitcher'
import { pauseSmoothScroller, resumeSmoothScroller } from '../lib/scroll'
import { useLanguage } from '../hooks/useLanguage'

const navItems = [
  { key: 'home', to: '/#home', section: 'home' },
  { key: 'about', to: '/#about', section: 'about' },
  { key: 'menu', to: '/menu', section: 'menu-categories' },
  { key: 'shisha', to: '/#shisha', section: 'shisha' },
  { key: 'gallery', to: '/gallery', section: 'gallery-page' },
  { key: 'location', to: '/#location', section: 'location' },
  { key: 'contact', to: '/#contact', section: 'contact' },
]

export default function Navbar() {
  const { copy } = useLanguage()
  const location = useLocation()
  const [isScrolled, setIsScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('home')

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (location.pathname === '/menu') {
      setActiveSection('menu-categories')
      return undefined
    }

    if (location.pathname === '/gallery') {
      setActiveSection('gallery-page')
      return undefined
    }

    // Each anchor activates on the same line it scrolls to (its scroll-margin-top), so a
    // click always highlights the item it navigated to. Cached — it only moves on resize.
    const lines = new Map()
    const lineFor = (element, section) => {
      if (!lines.has(section)) {
        const declared = Number.parseFloat(window.getComputedStyle(element).scrollMarginTop)
        const fallback = (document.querySelector('.site-header')?.offsetHeight ?? 0) + 24
        lines.set(section, Number.isFinite(declared) && declared > 0 ? declared : fallback)
      }
      return lines.get(section)
    }

    // The section whose top last passed its line wins, so exactly one link is ever active —
    // overlapping anchors such as location/contact can no longer light up together.
    const updateActiveSection = () => {
      let current = navItems[0].section
      let closest = Number.NEGATIVE_INFINITY

      navItems.forEach((item) => {
        const element = document.getElementById(item.section)
        if (!element) return
        const { top } = element.getBoundingClientRect()
        if (top - lineFor(element, item.section) <= 1 && top > closest) {
          closest = top
          current = item.section
        }
      })

      setActiveSection(current)
    }

    const handleResize = () => {
      lines.clear()
      updateActiveSection()
    }

    // Late media can reflow the page after the last scroll event; re-check so the highlight
    // never goes stale.
    const reflowObserver = new ResizeObserver(updateActiveSection)
    reflowObserver.observe(document.body)

    updateActiveSection()
    window.addEventListener('scroll', updateActiveSection, { passive: true })
    window.addEventListener('resize', handleResize)
    return () => {
      reflowObserver.disconnect()
      window.removeEventListener('scroll', updateActiveSection)
      window.removeEventListener('resize', handleResize)
    }
  }, [location.pathname])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname, location.hash])

  useEffect(() => {
    document.body.classList.toggle('mobile-menu-open', menuOpen)
    // Lenis drives scrolling from its own rAF loop, so overflow:hidden alone cannot
    // freeze the background. Pausing keeps the current position — it never rewinds.
    if (menuOpen) pauseSmoothScroller()
    else resumeSmoothScroller()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.classList.remove('mobile-menu-open')
      resumeSmoothScroller()
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  return (
    <header className={`site-header${isScrolled ? ' is-scrolled' : ''}`}>
      <nav className="site-nav shell" aria-label={copy.a11y.primaryNavigation}>
        <BrandLogo
          className="site-nav__logo"
          imageSrc="/images/logo/niola-header-logo.png"
          imageWidth={664}
          imageHeight={353}
        />

        <div className="site-nav__links">
          {navItems.map((item) => {
            const active = activeSection === item.section
            return (
              <Link
                key={item.key}
                to={item.to}
                className={active ? 'is-active' : undefined}
                aria-current={active ? 'page' : undefined}
              >
                {copy.nav[item.key]}
              </Link>
            )
          })}
        </div>

        <div className="site-nav__actions">
          <LanguageSwitcher />
          <button
            type="button"
            className={`menu-toggle${menuOpen ? ' is-open' : ''}`}
            onClick={() => setMenuOpen((current) => !current)}
            aria-label={menuOpen ? copy.a11y.closeMenu : copy.a11y.openMenu}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
          >
            <span />
            <span />
          </button>
        </div>
      </nav>

      {/* Portalled to <body>: the header applies backdrop-filter once scrolled, which makes
          it a containing block for position:fixed children and collapsed this overlay to the
          header's own box. At body level it is always sized to the viewport. */}
      {createPortal(
        <div
          id="mobile-navigation"
          className={`mobile-navigation${menuOpen ? ' is-open' : ''}`}
          aria-hidden={!menuOpen}
        >
        <div className="mobile-navigation__backdrop" onClick={() => setMenuOpen(false)} />
        <div className="mobile-navigation__panel" aria-label={copy.a11y.mobileNavigation}>
          <p className="mobile-navigation__eyebrow">NIOLA · ZAMALEK</p>
          <div className="mobile-navigation__links">
            {navItems.map((item, index) => {
              const active = activeSection === item.section
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  className={active ? 'is-active' : undefined}
                  aria-current={active ? 'page' : undefined}
                  style={{ '--nav-index': index }}
                  // Release the overlay and the scroll lock in the same flush as the
                  // navigation; doing it reactively could land after ScrollManager's frame,
                  // leaving the body still locked when the scroll ran.
                  onClick={() => setMenuOpen(false)}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {copy.nav[item.key]}
                </Link>
              )
            })}
          </div>
          <a className="mobile-navigation__phone" href="tel:+201060003800" dir="ltr">
            +20 10 6000 3800
          </a>
          </div>
        </div>,
        document.body,
      )}
    </header>
  )
}

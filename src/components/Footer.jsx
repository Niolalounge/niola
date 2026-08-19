import { Link } from 'react-router-dom'
import BrandLogo from './BrandLogo'
import LanguageSwitcher from './LanguageSwitcher'
import { useLanguage } from '../hooks/useLanguage'

export default function Footer() {
  const { copy } = useLanguage()

  return (
    <footer className="footer">
      <div className="shell footer__top">
        <div className="footer__brand">
          <BrandLogo
            imageSrc="/images/logo/niola-header-logo.png"
            imageWidth={664}
            imageHeight={353}
          />
          <p>{copy.footer.tagline}</p>
        </div>
        <nav className="footer__nav" aria-label={copy.footer.navigationLabel}>
          <Link to="/#home">{copy.nav.home}</Link>
          <Link to="/#about">{copy.nav.about}</Link>
          <Link to="/menu">{copy.nav.menu}</Link>
          <Link to="/#shisha">{copy.nav.shisha}</Link>
          <Link to="/#location">{copy.nav.location}</Link>
        </nav>
        <div className="footer__contact">
          <a href="tel:+201060003800" dir="ltr">+20 10 6000 3800</a>
          <p>{copy.location.address}</p>
          <LanguageSwitcher className="language-switcher--footer" />
        </div>
      </div>
      <div className="shell footer__bottom">
        <p>{copy.footer.copyright} · {copy.footer.rights}</p>
        <p>
          {copy.footer.creditPrefix}{' '}
          <a
            href="https://wa.me/905352973229"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={copy.footer.creditLabel}
          >
            {copy.footer.creditName}
          </a>
        </p>
      </div>
    </footer>
  )
}

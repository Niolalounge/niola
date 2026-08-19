import { Link } from 'react-router-dom'
import { useLanguage } from '../hooks/useLanguage'

export default function BrandLogo({
  className = '',
  imageSrc = '/images/logo/niola-logo.png',
  imageWidth = 502,
  imageHeight = 174,
}) {
  const { copy } = useLanguage()

  return (
    <Link
      to="/#home"
      className={`brand-logo ${className}`.trim()}
      aria-label={copy.a11y.homeLink}
    >
      <img
        src={imageSrc}
        width={imageWidth}
        height={imageHeight}
        alt={copy.a11y.logoAlt}
      />
    </Link>
  )
}

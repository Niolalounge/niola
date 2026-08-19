import ArrowIcon from './ArrowIcon'
import { useLanguage } from '../hooks/useLanguage'

const mapUrl = 'https://www.google.com/maps/search/?api=1&query=Niola+Lounge+Zamalek+Cairo'

export default function LocationSection() {
  const { copy } = useLanguage()

  return (
    <section className="location section-pad" aria-label={copy.a11y.locationScene}>
      <div id="location" className="shell location__layout">
        <div className="location__media">
          <img
            src="/images/gallary/A view of the Nile.jpeg"
            alt={copy.location.imageAlt}
            width="1536"
            height="864"
            loading="lazy"
          />
          <div className="location__media-copy">
            <span>ZAMALEK</span>
            <span>CAIRO · EGYPT</span>
          </div>
        </div>

        <div className="location__copy">
          <p className="eyebrow eyebrow--dark">{copy.location.eyebrow}</p>
          <h2 className="display-heading display-heading--dark">{copy.location.title}</h2>
          <p className="location__description">{copy.location.description}</p>
          <dl id="contact" className="location__details">
            <div>
              <dt>{copy.location.addressLabel}</dt>
              <dd>{copy.location.address}</dd>
            </div>
            <div>
              <dt>{copy.location.phoneLabel}</dt>
              <dd dir="ltr"><a href="tel:+201060003800">{copy.location.phone}</a></dd>
            </div>
          </dl>
          <div className="location__actions">
            <a
              className="solid-button"
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={copy.a11y.getDirections}
            >
              {copy.location.mapCta}<ArrowIcon />
            </a>
            <a className="text-link text-link--dark" href="tel:+201060003800" aria-label={copy.a11y.callNiola}>
              {copy.location.callCta}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

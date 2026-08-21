// Layout data for the gallery page. Captions live in translations.js under
// copy.gallery.items.<key>, keyed by the `key` field below.
//
// This is the static fallback: when Supabase is reachable, ContentProvider replaces it with the
// gallery_items rows, which carry their own bilingual label and alt text.

export const galleryItems = [
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

export default galleryItems

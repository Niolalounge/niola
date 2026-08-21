import { selectFrom, isSupabaseConfigured } from './supabase'
import { menuCategories, homepageCategories } from '../data/menuData'
import { galleryItems } from '../data/galleryData'
import { translations } from '../data/translations'
import {
  categoryImageDimensions,
  productImageDimensionOverrides,
  categoryOrder,
  categorySubtitleKey,
  hiddenProductSlugs,
} from '../data/imageDimensions'

/**
 * One shape for the menu and the gallery, whichever source they came from.
 *
 *   category    { slug, name, subtitle, products: [{ slug, name, price, image, imageWidth, imageHeight }] }
 *   homeTile    { slug, name, subtitle, image }
 *   galleryItem { key, layout, src, width, height, objectPosition, label, alt }
 *
 * Every user-visible string is a `{ ar, en }` pair, so components index it with the active
 * language and never care whether Supabase or src/data produced it.
 *
 * Row Level Security already limits the anon key to published rows, so the queries below do not
 * repeat an is_published filter — an unpublished row is simply absent from the response.
 */

const pair = (row, field) => ({ ar: row[`${field}_ar`], en: row[`${field}_en`] })

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------

// PostgREST select lists must not contain whitespace.
const MENU_SELECT = [
  'slug,name_ar,name_en,subtitle_ar,subtitle_en,sort_order',
  'default_image_width,default_image_height',
  'homepage_image_url,homepage_name_ar,homepage_name_en,homepage_sort_order',
  'menu_products(slug,name_ar,name_en,price,image_url,image_width,image_height,sort_order)',
].join(',')

const GALLERY_SELECT = [
  'slug,label_ar,label_en,alt_ar,alt_en',
  'image_url,image_width,image_height,layout,object_position,sort_order',
].join(',')

const toCategory = (row) => ({
  slug: row.slug,
  name: pair(row, 'name'),
  subtitle: pair(row, 'subtitle'),
  products: [...(row.menu_products ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((product) => ({
      slug: product.slug,
      name: pair(product, 'name'),
      price: product.price,
      image: product.image_url,
      imageWidth: product.image_width ?? row.default_image_width,
      imageHeight: product.image_height ?? row.default_image_height,
    })),
})

const toHomeTile = (row) => ({
  slug: row.slug,
  // A tile may carry its own label — the homepage says "Iced Coffee" where the menu says
  // "Iced Drinks" — and falls back to the category name when it does not.
  name: row.homepage_name_ar
    ? { ar: row.homepage_name_ar, en: row.homepage_name_en }
    : pair(row, 'name'),
  subtitle: pair(row, 'subtitle'),
  image: row.homepage_image_url,
})

const toGalleryItem = (row) => ({
  key: row.slug,
  layout: row.layout,
  src: row.image_url,
  width: row.image_width,
  height: row.image_height,
  objectPosition: row.object_position,
  label: pair(row, 'label'),
  alt: pair(row, 'alt'),
})

export async function fetchMenu() {
  const data = await selectFrom('menu_categories', {
    select: MENU_SELECT,
    order: 'sort_order',
    'menu_products.order': 'sort_order',
  })

  if (!data?.length) throw new Error('menu_categories returned no rows')

  // A category with nothing left to show would render an empty section with a "00" count.
  const categories = data.map(toCategory).filter((category) => category.products.length > 0)
  const visible = new Set(categories.map((category) => category.slug))

  return {
    categories,
    homeTiles: data
      // A tile links to /menu#<slug>. Dropping the last visible product from a category — which
      // happens whenever a photo is pulled, since a product needs one to be published — would
      // otherwise leave a tile pointing at a section that no longer exists.
      .filter((row) => row.homepage_sort_order !== null && row.homepage_image_url && visible.has(row.slug))
      .sort((a, b) => a.homepage_sort_order - b.homepage_sort_order)
      .map(toHomeTile),
  }
}

export async function fetchGallery() {
  const data = await selectFrom('gallery_items', {
    select: GALLERY_SELECT,
    order: 'sort_order',
  })

  if (!data?.length) throw new Error('gallery_items returned no rows')

  return data.map(toGalleryItem)
}

// ---------------------------------------------------------------------------
// Static fallback — the site's pre-database behaviour, reproduced exactly
// ---------------------------------------------------------------------------

const subtitleFor = (slug) => {
  const key = categorySubtitleKey[slug]
  return key
    ? { ar: translations.ar.menu.categorySubtitles[key], en: translations.en.menu.categorySubtitles[key] }
    : { ar: '', en: '' }
}

const hidden = new Set(hiddenProductSlugs)

const staticCategories = categoryOrder
  .map((slug) => menuCategories.find((category) => category.slug === slug))
  .filter(Boolean)
  .map((category) => {
    const fallbackSize = categoryImageDimensions[category.slug] ?? []

    return {
      slug: category.slug,
      name: category.name,
      subtitle: subtitleFor(category.slug),
      products: category.products
        .filter((product) => product.image && !hidden.has(product.slug))
        .map((product) => {
          const [width, height] = productImageDimensionOverrides[`${category.slug}/${product.slug}`]
            ?? fallbackSize

          return {
            slug: product.slug,
            name: product.name,
            price: product.price,
            image: product.image,
            imageWidth: width,
            imageHeight: height,
          }
        }),
    }
  })
  .filter((category) => category.products.length > 0)

const staticHomeTiles = homepageCategories.map((category) => ({
  slug: category.slug,
  name: category.name,
  subtitle: subtitleFor(category.slug),
  image: category.image,
}))

const staticGallery = galleryItems.map((item) => ({
  key: item.key,
  layout: item.layout,
  src: item.src,
  width: item.width,
  height: item.height,
  objectPosition: item.objectPosition,
  label: {
    ar: translations.ar.gallery.items[item.key].label,
    en: translations.en.gallery.items[item.key].label,
  },
  alt: {
    ar: translations.ar.gallery.items[item.key].alt,
    en: translations.en.gallery.items[item.key].alt,
  },
}))

export const staticContent = {
  menu: { categories: staticCategories, homeTiles: staticHomeTiles },
  gallery: staticGallery,
}

export { isSupabaseConfigured }

/**
 * Extracts the site's content into a single JSON document, so the Supabase seed is generated
 * from the real source of truth rather than transcribed by hand.
 *
 * Reads:
 *   src/data/menuData.js        — categories, products, homepage tiles
 *   src/data/translations.js    — bilingual category subtitles and gallery captions
 *   src/data/imageDimensions.js — display order, subtitle keys, fallback image sizes
 *   src/data/galleryData.js     — gallery layout data
 *
 * Writes: supabase/content-source.json
 *
 * Usage: node scripts/extract-content.mjs
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fromRoot = (relative) => resolve(projectRoot, relative)
const importFromRoot = (relative) => import(pathToFileURL(fromRoot(relative)).href)

/**
 * Reads the real pixel dimensions out of a PNG or JPEG header.
 *
 * imageDimensions.js carries hand-maintained dimension maps, and at least one entry has drifted from the
 * file it describes. The rendered <img width/height> exists to reserve the right box before the
 * image loads, so the seed takes its numbers from the files themselves and treats the maps as a
 * fallback only.
 */
function readImageDimensions(buffer) {
  const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)]
  }

  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null

  // Walk the JPEG marker chain to the start-of-frame segment, which carries the dimensions.
  let offset = 2
  while (offset < buffer.length - 8) {
    if (buffer[offset] !== 0xff) {
      offset += 1
      continue
    }

    const marker = buffer[offset + 1]
    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf
      && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isStartOfFrame) {
      return [buffer.readUInt16BE(offset + 7), buffer.readUInt16BE(offset + 5)]
    }

    offset += 2 + buffer.readUInt16BE(offset + 2)
  }

  return null
}

async function measureImage(publicPath) {
  try {
    const buffer = await readFile(fromRoot(`public/${decodeURIComponent(publicPath)}`))
    return readImageDimensions(buffer)
  } catch {
    return null
  }
}


const [
  { menuCategories, homepageCategories },
  { translations },
  {
    categoryOrder: preferredOrder,
    categorySubtitleKey: translationCategoryKey,
    categoryImageDimensions,
    productImageDimensionOverrides,
    hiddenProductSlugs,
  },
  { galleryItems },
] = await Promise.all([
  importFromRoot('src/data/menuData.js'),
  importFromRoot('src/data/translations.js'),
  importFromRoot('src/data/imageDimensions.js'),
  importFromRoot('src/data/galleryData.js'),
])

// Products the menu hid even though they have an image; the seed records them as unpublished
// rather than repeating the exclusion in the UI.
const EXPLICITLY_HIDDEN_PRODUCT_SLUGS = new Set(hiddenProductSlugs)

const bilingual = (key, path) => {
  const read = (language) => path.reduce((node, step) => node?.[step], translations[language])
  const ar = read('ar')?.[key]
  const en = read('en')?.[key]
  if (typeof ar !== 'string' || typeof en !== 'string') {
    throw new Error(`translations: missing ar/en for ${[...path, key].join('.')}`)
  }
  return { ar, en }
}

const homepageBySlug = new Map(homepageCategories.map((category) => [category.slug, category]))

const measurementCorrections = []

const categories = await Promise.all(menuCategories.map(async (category) => {
  const subtitleKey = translationCategoryKey[category.slug]
  if (!subtitleKey) throw new Error(`imageDimensions.js: no subtitle key for category "${category.slug}"`)

  const orderIndex = preferredOrder.indexOf(category.slug)
  const [fallbackWidth, fallbackHeight] = categoryImageDimensions[category.slug] ?? []
  if (!fallbackWidth) throw new Error(`imageDimensions.js: no image dimensions for category "${category.slug}"`)

  const homepage = homepageBySlug.get(category.slug)

  return {
    slug: category.slug,
    name: category.name,
    subtitle: bilingual(subtitleKey, ['menu', 'categorySubtitles']),
    sort_order: orderIndex === -1 ? preferredOrder.length : orderIndex,
    is_published: orderIndex !== -1,
    default_image_width: fallbackWidth,
    default_image_height: fallbackHeight,
    // The homepage tile uses its own hero image and its own English label for some categories
    // (e.g. "Iced Coffee" on the homepage vs "Iced Drinks" on the menu page).
    homepage_image_url: homepage?.image ?? null,
    homepage_name: homepage?.name ?? null,
    homepage_sort_order: homepage ? homepageCategories.indexOf(homepage) : null,
    products: await Promise.all(category.products.map(async (product, productIndex) => {
      let width = null
      let height = null

      if (product.image) {
        const declared = productImageDimensionOverrides[`${category.slug}/${product.slug}`]
          ?? [fallbackWidth, fallbackHeight]
        const measured = await measureImage(product.image)
        ;[width, height] = measured ?? declared

        if (measured && (measured[0] !== declared[0] || measured[1] !== declared[1])) {
          measurementCorrections.push({
            item: `${category.slug}/${product.slug}`,
            declaredInSource: `${declared[0]}x${declared[1]}`,
            measured: `${measured[0]}x${measured[1]}`,
          })
        }
      }

      return {
        slug: product.slug,
        name: product.name,
        price: product.price,
        image_url: product.image ?? null,
        image_width: width,
        image_height: height,
        sort_order: productIndex,
        // The menu renders only products that have an image and are not explicitly excluded.
        is_published: Boolean(product.image) && !EXPLICITLY_HIDDEN_PRODUCT_SLUGS.has(product.slug),
      }
    })),
  }
}))

const gallery = await Promise.all(galleryItems.map(async (item, index) => {
  const measured = await measureImage(item.src)
  if (measured && (measured[0] !== item.width || measured[1] !== item.height)) {
    measurementCorrections.push({
      item: `gallery/${item.key}`,
      declaredInSource: `${item.width}x${item.height}`,
      measured: `${measured[0]}x${measured[1]}`,
    })
  }
  const [width, height] = measured ?? [item.width, item.height]

  return {
    slug: item.key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
    legacy_key: item.key,
    label: bilingual('label', ['gallery', 'items', item.key]),
    alt: bilingual('alt', ['gallery', 'items', item.key]),
    image_url: item.src,
    image_width: width,
    image_height: height,
    layout: item.layout,
    object_position: item.objectPosition,
    sort_order: index,
    is_published: true,
  }
}))

const productSlugs = categories.flatMap((category) => category.products.map((product) => product.slug))
const duplicateProductSlugs = [...new Set(productSlugs.filter(
  (slug, index) => productSlugs.indexOf(slug) !== index,
))]

const content = {
  generatedFrom: [
    'src/data/menuData.js',
    'src/data/translations.js',
    'src/data/imageDimensions.js',
    'src/data/galleryData.js',
  ],
  stats: {
    categories: categories.length,
    publishedCategories: categories.filter((category) => category.is_published).length,
    products: productSlugs.length,
    publishedProducts: categories.flatMap((c) => c.products).filter((p) => p.is_published).length,
    galleryItems: gallery.length,
    duplicateProductSlugs,
    measurementCorrections,
  },
  categories,
  gallery,
}

await mkdir(fromRoot('supabase'), { recursive: true })
await writeFile(fromRoot('supabase/content-source.json'), `${JSON.stringify(content, null, 2)}\n`, 'utf8')

console.log('Wrote supabase/content-source.json')
console.log(JSON.stringify(content.stats, null, 2))

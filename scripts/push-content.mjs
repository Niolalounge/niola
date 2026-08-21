/**
 * Pushes supabase/content-source.json into a Supabase project over the REST API.
 *
 * This is the counterpart to 0002_seed_content.sql for people who would rather not paste SQL:
 * it upserts the same rows on their slug, so it is safe to re-run after editing src/data and
 * re-running extract-content.mjs. It cannot create the tables — run 0001_schema.sql first.
 *
 * Requires the service_role key, which bypasses RLS. Pass it in the environment; never commit it.
 *
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<secret> \
 *   node scripts/push-content.mjs
 */

import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const url = process.env.SUPABASE_URL?.replace(/\/$/, '')
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.')
  process.exit(1)
}

const content = JSON.parse(
  await readFile(resolve(projectRoot, 'supabase/content-source.json'), 'utf8'),
)

async function request(path, { method = 'GET', body, prefer } = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`${method} ${path} -> ${response.status}\n${text}`)
  }
  return text ? JSON.parse(text) : null
}

/** Upserts on the table's slug and returns the written rows. */
const upsert = (table, rows) => request(
  `${table}?on_conflict=slug`,
  { method: 'POST', body: rows, prefer: 'resolution=merge-duplicates,return=representation' },
)

// ---- categories ----------------------------------------------------------

const categoryRows = content.categories.map((category) => ({
  slug: category.slug,
  name_ar: category.name.ar,
  name_en: category.name.en,
  subtitle_ar: category.subtitle.ar,
  subtitle_en: category.subtitle.en,
  sort_order: category.sort_order,
  is_published: category.is_published,
  default_image_width: category.default_image_width,
  default_image_height: category.default_image_height,
  homepage_image_url: category.homepage_image_url,
  homepage_name_ar: category.homepage_name?.ar ?? null,
  homepage_name_en: category.homepage_name?.en ?? null,
  homepage_sort_order: category.homepage_sort_order,
}))

const writtenCategories = await upsert('menu_categories', categoryRows)
console.log(`menu_categories  ${writtenCategories.length} rows`)

// ---- products ------------------------------------------------------------

// menu_products.category_id is a uuid, so the slugs have to be resolved to ids first.
const categoryIdBySlug = new Map(writtenCategories.map((row) => [row.slug, row.id]))

const productRows = content.categories.flatMap((category) => category.products.map((product) => ({
  category_id: categoryIdBySlug.get(category.slug),
  slug: product.slug,
  name_ar: product.name.ar,
  name_en: product.name.en,
  price: product.price,
  image_url: product.image_url,
  image_width: product.image_width,
  image_height: product.image_height,
  sort_order: product.sort_order,
  is_published: product.is_published,
})))

const writtenProducts = await upsert('menu_products', productRows)
console.log(`menu_products    ${writtenProducts.length} rows`)

// ---- gallery -------------------------------------------------------------

const galleryRows = content.gallery.map((item) => ({
  slug: item.slug,
  label_ar: item.label.ar,
  label_en: item.label.en,
  alt_ar: item.alt.ar,
  alt_en: item.alt.en,
  image_url: item.image_url,
  image_width: item.image_width,
  image_height: item.image_height,
  layout: item.layout,
  object_position: item.object_position,
  sort_order: item.sort_order,
  is_published: item.is_published,
}))

const writtenGallery = await upsert('gallery_items', galleryRows)
console.log(`gallery_items    ${writtenGallery.length} rows`)

const publishedProducts = writtenProducts.filter((row) => row.is_published).length
console.log(`\nDone. ${publishedProducts} of ${writtenProducts.length} products are published and visible to the site.`)

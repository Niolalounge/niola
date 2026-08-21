/**
 * Diffs what is in Supabase against supabase/content-source.json and reports every field that
 * has drifted. Read-only unless you pass --repair.
 *
 *   DATABASE_URL="postgresql://…" node scripts/verify-content.mjs
 *   DATABASE_URL="postgresql://…" node scripts/verify-content.mjs --repair
 *
 * Menu edits made through the dashboard are meant to diverge from the seed, so a difference here
 * is not automatically wrong — it is a list of everything that no longer matches what shipped in
 * src/data. Use it after a migration, after a bulk edit, or when something on the site looks off.
 *
 * Exits non-zero when anything differs, so it can gate a deploy.
 */

import pg from 'pg'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repair = process.argv.includes('--repair')

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('Set DATABASE_URL to the Supabase session-pooler connection string.')
  process.exit(1)
}

const source = JSON.parse(await readFile(resolve(projectRoot, 'supabase/content-source.json'), 'utf8'))
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })
await client.connect()

const differences = []
const note = (table, key, field, expected, actual) => {
  differences.push({ table, key, field, expected, actual })
}

// ---- categories ----------------------------------------------------------

const categoryRows = new Map(
  (await client.query('select * from public.menu_categories')).rows.map((row) => [row.slug, row]),
)

for (const category of source.categories) {
  const row = categoryRows.get(category.slug)
  if (!row) {
    note('menu_categories', category.slug, '(row)', 'present', 'missing')
    continue
  }
  const fields = {
    name_ar: category.name.ar,
    name_en: category.name.en,
    subtitle_ar: category.subtitle.ar,
    subtitle_en: category.subtitle.en,
    sort_order: category.sort_order,
    default_image_width: category.default_image_width,
    default_image_height: category.default_image_height,
    homepage_image_url: category.homepage_image_url,
    homepage_sort_order: category.homepage_sort_order,
  }
  for (const [field, expected] of Object.entries(fields)) {
    if (String(row[field]) !== String(expected)) note('menu_categories', category.slug, field, expected, row[field])
  }
  categoryRows.delete(category.slug)
}
for (const slug of categoryRows.keys()) note('menu_categories', slug, '(row)', 'not in source', 'present')

// ---- products ------------------------------------------------------------

const productRows = new Map(
  (await client.query(`
    select p.*, c.slug as category_slug
    from public.menu_products p
    join public.menu_categories c on c.id = p.category_id
  `)).rows.map((row) => [row.slug, row]),
)

for (const category of source.categories) {
  for (const product of category.products) {
    const row = productRows.get(product.slug)
    if (!row) {
      note('menu_products', product.slug, '(row)', 'present', 'missing')
      continue
    }
    const fields = {
      category_slug: category.slug,
      name_ar: product.name.ar,
      name_en: product.name.en,
      price: product.price,
      image_url: product.image_url,
      image_width: product.image_width,
      image_height: product.image_height,
      sort_order: product.sort_order,
      is_published: product.is_published,
    }
    for (const [field, expected] of Object.entries(fields)) {
      if (String(row[field]) !== String(expected)) note('menu_products', product.slug, field, expected, row[field])
    }
    productRows.delete(product.slug)
  }
}
// Products added through the dashboard live only in the database, so they are listed rather than
// treated as corruption.
const addedInDashboard = [...productRows.keys()]

// ---- gallery -------------------------------------------------------------

const galleryRows = new Map(
  (await client.query('select * from public.gallery_items')).rows.map((row) => [row.slug, row]),
)

for (const item of source.gallery) {
  const row = galleryRows.get(item.slug)
  if (!row) {
    note('gallery_items', item.slug, '(row)', 'present', 'missing')
    continue
  }
  const fields = {
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
  }
  for (const [field, expected] of Object.entries(fields)) {
    if (String(row[field]) !== String(expected)) note('gallery_items', item.slug, field, expected, row[field])
  }
}

// ---- report --------------------------------------------------------------

if (addedInDashboard.length) {
  console.log(`${addedInDashboard.length} product(s) exist only in the database (added through the dashboard):`)
  addedInDashboard.forEach((slug) => console.log(`  ${slug}`))
  console.log()
}

if (!differences.length) {
  console.log('Everything matches supabase/content-source.json.')
  await client.end()
  process.exit(0)
}

console.log(`${differences.length} difference(s) from supabase/content-source.json:\n`)
for (const d of differences) {
  console.log(`  ${d.table} · ${d.key} · ${d.field}`)
  console.log(`      source: ${d.expected}`)
  console.log(`      db:     ${d.actual}`)
}

if (!repair) {
  console.log('\nRe-run with --repair to write the source values back.')
  await client.end()
  process.exit(1)
}

console.log('\nrepairing…')
for (const d of differences) {
  if (d.field === '(row)') {
    console.log(`  skipped ${d.table} · ${d.key} — a missing or extra row needs a decision, not an overwrite`)
    continue
  }
  await client.query(
    `update public.${d.table} set ${d.field} = $1 where slug = $2`,
    [d.expected, d.key],
  )
  console.log(`  ${d.table} · ${d.key} · ${d.field} -> ${d.expected}`)
}

await client.end()
console.log('done.')

/**
 * Turns supabase/content-source.json into a re-runnable seed migration.
 *
 * The output is idempotent: every statement upserts on the row's slug, so re-running it after
 * editing src/data (then re-running extract-content.mjs) pushes the change without duplicating
 * rows. Rows added by hand in the Supabase dashboard are left alone unless their slug collides.
 *
 * Usage:
 *   node scripts/extract-content.mjs
 *   node scripts/generate-seed.mjs
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fromRoot = (relative) => resolve(projectRoot, relative)

const content = JSON.parse(await readFile(fromRoot('supabase/content-source.json'), 'utf8'))

/** Renders a JS value as a SQL literal. Postgres escapes a quote by doubling it. */
function sql(value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) throw new Error(`non-integer number in seed: ${value}`)
    return String(value)
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return `'${String(value).replace(/'/g, "''")}'`
}

/**
 * Builds one bulk upsert.
 *
 * `source` columns become a typed VALUES list — the cast matters because an all-null column
 * has no type Postgres can infer. `insert` maps target columns to expressions over that list,
 * which is how menu_products resolves its category_id from a category slug.
 */
function upsert({ table, source, insert, rows, conflictTarget, join = '' }) {
  const sourceNames = source.map(([name]) => name)
  const targetNames = Object.keys(insert)
  const selectList = Object.values(insert).join(', ')
  const valueRows = rows.map((row) => `    (${row.map(sql).join(', ')})`).join(',\n')

  const updates = targetNames
    .filter((name) => name !== conflictTarget)
    .map((name) => `  ${name} = excluded.${name}`)
    .join(',\n')

  return `insert into public.${table} (${targetNames.join(', ')})
select ${selectList}
from (values
${valueRows}
) as v(${sourceNames.join(', ')})${join}
on conflict (${conflictTarget}) do update set
${updates};`
}

/** `slug text` -> the `v.slug::text` expression used in the SELECT list. */
const typed = (source) => Object.fromEntries(
  source.map(([name, type]) => [name, `v.${name}::${type}`]),
)

// ---- categories ----------------------------------------------------------

const categorySource = [
  ['slug', 'text'],
  ['name_ar', 'text'],
  ['name_en', 'text'],
  ['subtitle_ar', 'text'],
  ['subtitle_en', 'text'],
  ['sort_order', 'integer'],
  ['is_published', 'boolean'],
  ['default_image_width', 'integer'],
  ['default_image_height', 'integer'],
  ['homepage_image_url', 'text'],
  ['homepage_name_ar', 'text'],
  ['homepage_name_en', 'text'],
  ['homepage_sort_order', 'integer'],
]

const categoryRows = content.categories.map((category) => [
  category.slug,
  category.name.ar,
  category.name.en,
  category.subtitle.ar,
  category.subtitle.en,
  category.sort_order,
  category.is_published,
  category.default_image_width,
  category.default_image_height,
  category.homepage_image_url,
  category.homepage_name?.ar ?? null,
  category.homepage_name?.en ?? null,
  category.homepage_sort_order,
])

// ---- products ------------------------------------------------------------

const productSource = [
  ['category_slug', 'text'],
  ['slug', 'text'],
  ['name_ar', 'text'],
  ['name_en', 'text'],
  ['price', 'integer'],
  ['image_url', 'text'],
  ['image_width', 'integer'],
  ['image_height', 'integer'],
  ['sort_order', 'integer'],
  ['is_published', 'boolean'],
]

const productRows = content.categories.flatMap((category) => category.products.map((product) => [
  category.slug,
  product.slug,
  product.name.ar,
  product.name.en,
  product.price,
  product.image_url,
  product.image_width,
  product.image_height,
  product.sort_order,
  product.is_published,
]))

// ---- gallery -------------------------------------------------------------

const gallerySource = [
  ['slug', 'text'],
  ['label_ar', 'text'],
  ['label_en', 'text'],
  ['alt_ar', 'text'],
  ['alt_en', 'text'],
  ['image_url', 'text'],
  ['image_width', 'integer'],
  ['image_height', 'integer'],
  ['layout', 'text'],
  ['object_position', 'text'],
  ['sort_order', 'integer'],
  ['is_published', 'boolean'],
]

const galleryRows = content.gallery.map((item) => [
  item.slug,
  item.label.ar,
  item.label.en,
  item.alt.ar,
  item.alt.en,
  item.image_url,
  item.image_width,
  item.image_height,
  item.layout,
  item.object_position,
  item.sort_order,
  item.is_published,
])

// ---- emit ----------------------------------------------------------------

const productTargets = typed(productSource)
delete productTargets.category_slug

const statements = [
  upsert({
    table: 'menu_categories',
    source: categorySource,
    insert: typed(categorySource),
    rows: categoryRows,
    conflictTarget: 'slug',
  }),
  upsert({
    table: 'menu_products',
    source: productSource,
    insert: { category_id: 'c.id', ...productTargets },
    rows: productRows,
    conflictTarget: 'slug',
    join: '\njoin public.menu_categories c on c.slug = v.category_slug::text',
  }),
  upsert({
    table: 'gallery_items',
    source: gallerySource,
    insert: typed(gallerySource),
    rows: galleryRows,
    conflictTarget: 'slug',
  }),
]

const header = `-- Niola Lounge — content seed
--
-- GENERATED FILE. Do not edit by hand.
--   node scripts/extract-content.mjs   (reads src/data + src/pages into supabase/content-source.json)
--   node scripts/generate-seed.mjs     (writes this file)
--
-- Source: ${content.generatedFrom.join(', ')}
-- Contents: ${content.stats.categories} categories, ${content.stats.products} products
--           (${content.stats.publishedProducts} published), ${content.stats.galleryItems} gallery items.
--
-- Safe to re-run: every statement upserts on slug.

begin;

`

await mkdir(fromRoot('supabase/migrations'), { recursive: true })
await writeFile(
  fromRoot('supabase/migrations/0002_seed_content.sql'),
  `${header}${statements.join('\n\n')}\n\ncommit;\n`,
  'utf8',
)

console.log('Wrote supabase/migrations/0002_seed_content.sql')
console.log(`  ${categoryRows.length} categories, ${productRows.length} products, ${galleryRows.length} gallery items`)

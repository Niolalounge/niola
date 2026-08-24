import { adminClient, MENU_IMAGE_BUCKET } from './adminClient'

/**
 * Everything the menu dashboard does to the database, in one place, so the page component stays
 * about rendering.
 *
 * Row Level Security decides what each call is allowed to touch: an administrator's requests
 * match every row, anyone else's match none. Nothing here is trusted to enforce access.
 */

const PRODUCT_FIELDS = 'id,slug,name_ar,name_en,price,image_url,image_width,image_height,sort_order,is_published'

const CATEGORY_FIELDS = 'id,slug,name_ar,name_en,subtitle_ar,subtitle_en,sort_order,is_published'

/** Loads every category with all of its products — hidden categories and hidden products alike. */
export async function loadMenu() {
  const { data, error } = await adminClient
    .from('menu_categories')
    .select(`${CATEGORY_FIELDS},menu_products(${PRODUCT_FIELDS})`)
    .order('sort_order')
    .order('sort_order', { referencedTable: 'menu_products' })

  if (error) throw error

  return data.map((category) => ({
    ...category,
    products: [...(category.menu_products ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  }))
}

/**
 * Calls back whenever anything in the menu changes, including edits made by another
 * administrator or straight from the Supabase dashboard.
 *
 * Watches content_revision rather than menu_products: an administrator can read every row, but
 * the counter is one event per statement instead of one per changed row, so a bulk edit does not
 * fan out into dozens of refetches.
 */
export function subscribeToMenuChanges(onChange) {
  const channel = adminClient
    .channel('niola-admin-content')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'content_revision' },
      () => onChange(),
    )
    .subscribe()

  return () => { adminClient.removeChannel(channel) }
}

export async function updateProduct(id, changes) {
  const { data, error } = await adminClient
    .from('menu_products')
    .update(changes)
    .eq('id', id)
    .select(PRODUCT_FIELDS)
    .single()

  if (error) throw error
  return data
}

export async function deleteProduct(id) {
  const { error } = await adminClient.from('menu_products').delete().eq('id', id)
  if (error) throw error
}

/**
 * Slugs are the stable public identifier and must be unique across the whole menu, so this
 * derives one from the English name and adds a numeric suffix if it is already taken.
 */
export function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function findFreeSlug(base, { table = 'menu_products', fallback = 'product' } = {}) {
  const root = slugify(base) || fallback
  const { data, error } = await adminClient
    .from(table)
    .select('slug')
    .like('slug', `${root}%`)

  if (error) throw error

  const taken = new Set(data.map((row) => row.slug))
  if (!taken.has(root)) return root

  let suffix = 2
  while (taken.has(`${root}-${suffix}`)) suffix += 1
  return `${root}-${suffix}`
}

/** Reads a picked file's real pixel size; the menu card needs it to reserve the right box. */
export function measureImageFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve({ width: image.naturalWidth, height: image.naturalHeight })
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('That file could not be read as an image.'))
    }
    image.src = objectUrl
  })
}

export async function uploadProductImage(file, slug) {
  const { width, height } = await measureImageFile(file)
  const extension = (file.name.split('.').pop() ?? 'png').toLowerCase()
  // The slug alone would collide with the previous photo in the browser and CDN cache.
  const path = `${slug}-${Date.now()}.${extension}`

  const { error } = await adminClient.storage
    .from(MENU_IMAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) throw error

  const { data } = adminClient.storage.from(MENU_IMAGE_BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, width, height }
}

export async function createProduct({ categoryId, nameAr, nameEn, price, file }) {
  const slug = await findFreeSlug(nameEn || nameAr)

  // A product may only be published once it has an image and its dimensions — the database
  // enforces that, so the row is created hidden and published in a second step if a photo came
  // with it.
  const { data: created, error } = await adminClient
    .from('menu_products')
    .insert({
      category_id: categoryId,
      slug,
      name_ar: nameAr,
      name_en: nameEn,
      price,
      is_published: false,
    })
    .select(PRODUCT_FIELDS)
    .single()

  if (error) throw error
  if (!file) return created

  try {
    const image = await uploadProductImage(file, slug)
    return await updateProduct(created.id, {
      image_url: image.url,
      image_width: image.width,
      image_height: image.height,
      is_published: true,
    })
  } catch (cause) {
    // Leave a usable draft rather than a half-made row the editor cannot see.
    return { ...created, uploadError: cause.message }
  }
}

export async function setProductImage(product, file) {
  const image = await uploadProductImage(file, product.slug)
  return updateProduct(product.id, {
    image_url: image.url,
    image_width: image.width,
    image_height: image.height,
  })
}

// ---------------------------------------------------------------------------
// Categories
//
// A category is the section a product is filed under — "القهوة", "الشيشة". Renaming one is safe
// at any time: the slug is what /menu#<slug> and every saved link point at, and it never moves.
// ---------------------------------------------------------------------------

/**
 * New categories go to the end of the menu. sort_order is deliberately sparse (0, 10, 20 …) so a
 * later reordering can drop a row between two neighbours without renumbering the whole list.
 */
export async function createCategory({ nameAr, nameEn, subtitleAr, subtitleEn }) {
  const slug = await findFreeSlug(nameEn || nameAr, { table: 'menu_categories', fallback: 'category' })

  const { data: last, error: lastError } = await adminClient
    .from('menu_categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)

  if (lastError) throw lastError

  const { data, error } = await adminClient
    .from('menu_categories')
    .insert({
      slug,
      name_ar: nameAr,
      name_en: nameEn,
      subtitle_ar: subtitleAr || null,
      subtitle_en: subtitleEn || null,
      sort_order: (last?.[0]?.sort_order ?? 0) + 10,
    })
    .select(CATEGORY_FIELDS)
    .single()

  if (error) throw error
  // The dashboard keeps products nested inside their category, so a fresh one arrives with the
  // empty list the rest of the screen expects rather than an undefined it has to guard against.
  return { ...data, products: [] }
}

export async function updateCategory(id, changes) {
  const { data, error } = await adminClient
    .from('menu_categories')
    .update(changes)
    .eq('id', id)
    .select(CATEGORY_FIELDS)
    .single()

  if (error) throw error
  return data
}

/**
 * Only ever succeeds on an empty category: menu_products.category_id is ON DELETE RESTRICT, so
 * the database refuses to take thirty products down with a mis-click. The dashboard checks the
 * product count first and offers "hide" instead; this translates the constraint violation in
 * case the last product was removed in another tab between the check and the click.
 */
export async function deleteCategory(id) {
  const { error } = await adminClient.from('menu_categories').delete().eq('id', id)
  if (!error) return
  if (error.code === '23503') {
    throw new Error('لا يمكن حذف تصنيف ما زال يحتوي على منتجات. احذف منتجاته أولاً أو أخفِ التصنيف.')
  }
  throw error
}

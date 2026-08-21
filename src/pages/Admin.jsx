import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '../admin.css'
import { adminClient } from '../lib/adminClient'
import {
  createProduct,
  deleteProduct,
  loadMenu,
  setProductImage,
  subscribeToMenuChanges,
  updateProduct,
} from '../lib/adminApi'

const text = {
  title: 'إدارة المنيو',
  signIn: 'تسجيل الدخول',
  signOut: 'خروج',
  email: 'البريد الإلكتروني',
  password: 'كلمة المرور',
  signingIn: 'جارٍ الدخول…',
  notAdmin: 'هذا الحساب ليس له صلاحية تعديل المنيو.',
  loading: 'جارٍ التحميل…',
  retry: 'إعادة المحاولة',
  price: 'السعر',
  currency: 'ج.م',
  product: 'المنتج',
  photo: 'الصورة',
  status: 'الحالة',
  visible: 'ظاهر',
  hidden: 'مخفي',
  addProduct: 'إضافة منتج',
  category: 'التصنيف',
  willPublish: 'سيُضاف ويظهر على الموقع مباشرة.',
  willStayHidden: 'بدون صورة سيُضاف مخفياً — يمكنك إظهاره بعد رفع صورته.',
  nameAr: 'الاسم بالعربية',
  nameEn: 'الاسم بالإنجليزية',
  save: 'حفظ',
  saving: 'جارٍ الحفظ…',
  saved: 'تم الحفظ',
  cancel: 'إلغاء',
  remove: 'حذف',
  confirmRemove: (name) => `حذف «${name}» نهائياً؟`,
  changePhoto: 'تغيير الصورة',
  addPhoto: 'إضافة صورة',
  needsPhoto: 'يحتاج صورة',
  search: 'ابحث في كل المنيو…',
  clearSearch: 'مسح البحث',
  searchResults: 'نتائج البحث في كل التصنيفات',
  noResults: 'لا توجد نتائج مطابقة.',
  emptyCategory: 'لا توجد منتجات في هذا التصنيف بعد.',
  categories: 'التصنيفات',
  filters: {
    all: 'الكل',
    visible: 'الظاهر',
    hidden: 'المخفي',
    nophoto: 'بلا صورة',
  },
  stats: {
    total: 'منتج',
    visible: 'ظاهر',
    hidden: 'مخفي',
    nophoto: 'بلا صورة',
  },
  showing: (shown, total) => `${shown} من ${total}`,
}

/**
 * Arabic is written with several interchangeable letter forms, and product names are entered by
 * hand. Folding them means typing "شاي كرك" finds "شاى كرك" and "إسبريسو" finds "اسبريسو".
 */
function fold(value) {
  return String(value)
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .trim()
}

const FILTERS = {
  all: () => true,
  visible: (product) => product.is_published,
  hidden: (product) => !product.is_published,
  nophoto: (product) => !product.image_url,
}

function useSignedInAdmin() {
  const [session, setSession] = useState(undefined)
  const [isAdmin, setIsAdmin] = useState(null)

  useEffect(() => {
    adminClient.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = adminClient.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setIsAdmin(session === undefined ? null : false)
      return
    }
    // The database is the authority; this only decides which screen to render.
    adminClient.rpc('is_admin').then(({ data, error }) => setIsAdmin(!error && data === true))
  }, [session])

  return { session, isAdmin }
}

function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const { error: cause } = await adminClient.auth.signInWithPassword({ email, password })
    if (cause) setError(cause.message)
    setBusy(false)
  }

  return (
    <form className="admin-signin" onSubmit={submit}>
      <p className="admin-signin__mark">NIOLA</p>
      <h1>{text.title}</h1>
      <label>
        <span>{text.email}</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" dir="ltr" />
      </label>
      <label>
        <span>{text.password}</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" dir="ltr" />
      </label>
      {error && <p className="admin-error">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? text.signingIn : text.signIn}</button>
    </form>
  )
}

function ProductRow({ product, categoryName, onChange, onRemove }) {
  const [price, setPrice] = useState(String(product.price))
  // The checkbox answers the click immediately and only falls back to the stored value if the
  // write fails; without this it snaps back for the length of the round trip and reads as broken.
  const [published, setPublished] = useState(product.is_published)
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => { setPrice(String(product.price)) }, [product.price])
  useEffect(() => { setPublished(product.is_published) }, [product.is_published])

  /** Returns whether the write landed, so an optimistic control can put itself back if it did not. */
  const run = async (work) => {
    setState('saving')
    setError(null)
    try {
      onChange(await work())
      setState('saved')
      setTimeout(() => setState('idle'), 1600)
      return true
    } catch (cause) {
      setError(cause.message)
      setState('idle')
      return false
    }
  }

  const commitPrice = () => {
    const next = Number(price)
    if (!Number.isInteger(next) || next < 0 || next === product.price) {
      setPrice(String(product.price))
      return
    }
    run(() => updateProduct(product.id, { price: next }))
  }

  const canPublish = Boolean(product.image_url)

  return (
    <tr className={published ? undefined : 'is-hidden-row'}>
      <td className="admin-cell-photo">
        <button
          type="button"
          className="admin-thumb"
          onClick={() => fileRef.current?.click()}
          title={product.image_url ? text.changePhoto : text.addPhoto}
        >
          {product.image_url
            ? <img src={product.image_url} alt="" width="48" height="48" loading="lazy" />
            : <span className="admin-thumb__empty" aria-hidden="true">+</span>}
          <span className="admin-thumb__overlay">{product.image_url ? text.changePhoto : text.addPhoto}</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) run(() => setProductImage(product, file))
          }}
        />
      </td>

      <td className="admin-cell-name">
        <strong>{product.name_ar}</strong>
        <span className="admin-name-en" dir="ltr">{product.name_en}</span>
        {categoryName && <span className="admin-name-category">{categoryName}</span>}
      </td>

      <td className="admin-cell-price">
        <span className="admin-field">
          <input
            type="number"
            min="0"
            step="1"
            value={price}
            dir="ltr"
            onChange={(event) => setPrice(event.target.value)}
            onBlur={commitPrice}
            onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
            aria-label={`${text.price} — ${product.name_ar}`}
          />
          <span className="admin-field__suffix">{text.currency}</span>
        </span>
      </td>

      <td className="admin-cell-visible">
        <label className={`admin-switch${published ? ' is-on' : ''}${!canPublish && !published ? ' is-locked' : ''}`}>
          <input
            type="checkbox"
            checked={published}
            disabled={!canPublish && !published}
            onChange={async (event) => {
              const next = event.target.checked
              setPublished(next)
              const saved = await run(() => updateProduct(product.id, { is_published: next }))
              if (!saved) setPublished(product.is_published)
            }}
          />
          <span className="admin-switch__track" aria-hidden="true"><span /></span>
          <span className="admin-switch__label">
            {!canPublish && !published ? text.needsPhoto : (published ? text.visible : text.hidden)}
          </span>
        </label>
      </td>

      <td className="admin-cell-state">
        {state === 'saving' && <span className="admin-state">{text.saving}</span>}
        {state === 'saved' && <span className="admin-state is-ok">✓ {text.saved}</span>}
        {error && <span className="admin-error" role="alert">{error}</span>}
      </td>

      <td className="admin-cell-remove">
        <button
          type="button"
          className="admin-icon-button"
          title={text.remove}
          aria-label={`${text.remove} — ${product.name_ar}`}
          onClick={() => {
            if (window.confirm(text.confirmRemove(product.name_ar))) {
              run(async () => { await deleteProduct(product.id); onRemove(product.id); return null })
            }
          }}
        >
          ✕
        </button>
      </td>
    </tr>
  )
}

/**
 * Adding a product is a modal rather than a panel under the list: the button lives in the toolbar
 * now, so it is reachable without scrolling past 32 rows, and a category no longer has to be on
 * screen for it to work — the form carries its own category picker.
 *
 * Built on <dialog> so focus trapping, Escape, inertness of the page behind it, and the backdrop
 * all come from the browser instead of being re-implemented.
 */
function AddProductDialog({ open, categories, defaultCategoryId, onClose, onCreated }) {
  const dialogRef = useRef(null)
  const [categoryId, setCategoryId] = useState(defaultCategoryId)
  const [nameAr, setNameAr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [price, setPrice] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      setCategoryId(defaultCategoryId)
      setNameAr(''); setNameEn(''); setPrice(''); setFile(null); setError(null)
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open, defaultCategoryId])

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const created = await createProduct({
        categoryId,
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim(),
        price: Number(price),
        file,
      })
      onCreated(categoryId, created)
      // A failed upload still leaves a usable draft, so the dialog stays open to say so.
      if (created.uploadError) setError(created.uploadError)
      else onClose()
    } catch (cause) {
      setError(cause.message)
    }
    setBusy(false)
  }

  return (
    <dialog
      ref={dialogRef}
      className="admin-dialog"
      onClose={onClose}
      onClick={(event) => { if (event.target === dialogRef.current) onClose() }}
      aria-labelledby="admin-dialog-title"
    >
      <form className="admin-dialog__body" onSubmit={submit}>
        <header className="admin-dialog__head">
          <h2 id="admin-dialog-title">{text.addProduct}</h2>
          <button type="button" className="admin-icon-button" onClick={onClose} aria-label={text.cancel}>✕</button>
        </header>

        <div className="admin-dialog__grid">
          <label className="admin-dialog__wide">
            <span>{text.category}</span>
            <select value={categoryId ?? ''} onChange={(e) => setCategoryId(e.target.value)} required>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name_ar}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{text.nameAr}</span>
            <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} required autoFocus />
          </label>
          <label>
            <span>{text.nameEn}</span>
            <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} required dir="ltr" />
          </label>
          <label>
            <span>{text.price}</span>
            <input type="number" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} required dir="ltr" />
          </label>
          <label>
            <span>{text.photo}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <p className="admin-dialog__note">{file ? text.willPublish : text.willStayHidden}</p>
        {error && <p className="admin-error" role="alert">{error}</p>}

        <div className="admin-dialog__actions">
          <button type="submit" disabled={busy}>{busy ? text.saving : text.save}</button>
          <button type="button" className="admin-link" onClick={onClose}>{text.cancel}</button>
        </div>
      </form>
    </dialog>
  )
}

function Stat({ value, label, tone }) {
  return (
    <div className={`admin-stat${tone ? ` is-${tone}` : ''}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function Dashboard({ email }) {
  const [categories, setCategories] = useState(null)
  const [error, setError] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [adding, setAdding] = useState(false)

  const load = useCallback(() => {
    setError(null)
    loadMenu()
      .then((data) => {
        setCategories(data)
        setActiveId((current) => current ?? data[0]?.id ?? null)
      })
      .catch((cause) => setError(cause.message))
  }, [])

  useEffect(load, [load])

  // Another administrator — or someone editing straight from the Supabase dashboard — should not
  // leave this screen showing stale prices.
  useEffect(() => {
    let timer = null
    const unsubscribe = subscribeToMenuChanges(() => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        // Every one of this tab's own saves also bumps the revision. Refetching while a field is
        // focused would yank the value out from under whoever is typing in it.
        const editing = document.activeElement
        if (editing?.tagName === 'INPUT' && editing.closest('.admin-panel, .admin-dialog')) return
        load()
      }, 900)
    })
    return () => { clearTimeout(timer); unsubscribe() }
  }, [load])

  const replaceProduct = useCallback((updated) => {
    if (!updated) return
    setCategories((current) => current.map((category) => ({
      ...category,
      products: category.products.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
    })))
  }, [])

  const removeProduct = useCallback((productId) => {
    setCategories((current) => current.map((category) => ({
      ...category,
      products: category.products.filter((p) => p.id !== productId),
    })))
  }, [])

  const addProduct = useCallback((categoryId, created) => {
    setCategories((current) => current.map((category) => (
      category.id === categoryId
        ? { ...category, products: [...category.products, created] }
        : category
    )))
    // Show the new row rather than leaving it behind whichever category or search was open.
    setActiveId(categoryId)
    setQuery('')
    setFilter('all')
  }, [])

  const stats = useMemo(() => {
    if (!categories) return null
    const all = categories.flatMap((category) => category.products)
    return {
      total: all.length,
      visible: all.filter((p) => p.is_published).length,
      hidden: all.filter((p) => !p.is_published).length,
      nophoto: all.filter((p) => !p.image_url).length,
    }
  }, [categories])

  const searching = query.trim().length > 0

  /**
   * Only one category is on screen at a time — 115 rows at once is what made this unreadable.
   * A search is the exception: it looks across the whole menu, because otherwise finding a
   * product means remembering which category it is filed under.
   */
  const visibleRows = useMemo(() => {
    if (!categories) return []
    const matchesFilter = FILTERS[filter]

    if (searching) {
      const needle = fold(query)
      return categories.flatMap((category) => category.products
        .filter((product) => matchesFilter(product))
        .filter((product) => fold(product.name_ar).includes(needle) || fold(product.name_en).includes(needle))
        .map((product) => ({ product, categoryName: category.name_ar })))
    }

    const active = categories.find((category) => category.id === activeId)
    return (active?.products ?? [])
      .filter((product) => matchesFilter(product))
      .map((product) => ({ product, categoryName: null }))
  }, [categories, activeId, query, filter, searching])

  if (error) {
    return (
      <div className="admin-empty">
        <p className="admin-error">{error}</p>
        <button type="button" onClick={load}>{text.retry}</button>
      </div>
    )
  }
  if (!categories) return <p className="admin-state admin-state--page">{text.loading}</p>

  const active = categories.find((category) => category.id === activeId)
  const totalInScope = searching
    ? categories.flatMap((c) => c.products).length
    : (active?.products.length ?? 0)

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-header__title">
          <p className="admin-header__mark">NIOLA</p>
          <h1>{text.title}</h1>
        </div>
        <div className="admin-header__account">
          <span dir="ltr">{email}</span>
          <button type="button" className="admin-link" onClick={() => adminClient.auth.signOut()}>{text.signOut}</button>
        </div>
      </header>

      {stats && (
        <div className="admin-stats">
          <Stat value={stats.total} label={text.stats.total} />
          <Stat value={stats.visible} label={text.stats.visible} tone="ok" />
          <Stat value={stats.hidden} label={text.stats.hidden} tone="muted" />
          <Stat value={stats.nophoto} label={text.stats.nophoto} tone="warn" />
        </div>
      )}

      <div className="admin-layout">
        <nav className="admin-sidebar" aria-label={text.categories}>
          <p className="admin-sidebar__title">{text.categories}</p>
          <ul>
            {categories.map((category) => {
              const shown = category.products.filter((p) => p.is_published).length
              return (
                <li key={category.id}>
                  <button
                    type="button"
                    className={!searching && category.id === activeId ? 'is-active' : undefined}
                    aria-current={!searching && category.id === activeId ? 'true' : undefined}
                    onClick={() => { setActiveId(category.id); setQuery('') }}
                  >
                    <span>{category.name_ar}</span>
                    <span className="admin-sidebar__count">{shown}/{category.products.length}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <section className="admin-panel">
          <div className="admin-toolbar">
            <div className="admin-search">
              <input
                type="search"
                value={query}
                placeholder={text.search}
                onChange={(event) => setQuery(event.target.value)}
                aria-label={text.search}
              />
              {searching && (
                <button type="button" className="admin-icon-button" onClick={() => setQuery('')} aria-label={text.clearSearch}>✕</button>
              )}
            </div>

            <div className="admin-filters" role="group" aria-label={text.status}>
              {Object.keys(FILTERS).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={filter === key ? 'is-active' : undefined}
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                >
                  {text.filters[key]}
                </button>
              ))}
            </div>

            <button type="button" className="admin-add-button" onClick={() => setAdding(true)}>
              <span aria-hidden="true">+</span> {text.addProduct}
            </button>
          </div>

          <p className="admin-scope">
            {searching ? text.searchResults : active?.name_ar}
            <span>{text.showing(visibleRows.length, totalInScope)}</span>
          </p>

          {visibleRows.length === 0 ? (
            <p className="admin-state admin-state--empty">
              {searching || filter !== 'all' ? text.noResults : text.emptyCategory}
            </p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">{text.photo}</th>
                  <th scope="col">{text.product}</th>
                  <th scope="col">{text.price}</th>
                  <th scope="col">{text.status}</th>
                  <th scope="col"><span className="visually-hidden">{text.saved}</span></th>
                  <th scope="col"><span className="visually-hidden">{text.remove}</span></th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(({ product, categoryName }) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    categoryName={categoryName}
                    onChange={replaceProduct}
                    onRemove={removeProduct}
                  />
                ))}
              </tbody>
            </table>
          )}

        </section>
      </div>

      <AddProductDialog
        open={adding}
        categories={categories}
        defaultCategoryId={active?.id ?? categories[0]?.id}
        onClose={() => setAdding(false)}
        onCreated={addProduct}
      />
    </div>
  )
}

export default function Admin() {
  const { session, isAdmin } = useSignedInAdmin()

  useEffect(() => {
    document.documentElement.lang = 'ar'
    document.documentElement.dir = 'rtl'
    document.title = `${text.title} · Niola`

    // robots.txt asks crawlers not to fetch /admin; this tells the ones that do anyway not to
    // index it. A single-page route cannot send its own X-Robots-Tag header.
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  return (
    <div className="admin-page">
      {session === undefined && <p className="admin-state admin-state--page">{text.loading}</p>}
      {session === null && <SignIn />}
      {session && isAdmin === null && <p className="admin-state admin-state--page">{text.loading}</p>}
      {session && isAdmin === false && (
        <div className="admin-signin">
          <p className="admin-error">{text.notAdmin}</p>
          <button type="button" onClick={() => adminClient.auth.signOut()}>{text.signOut}</button>
        </div>
      )}
      {session && isAdmin === true && <Dashboard email={session.user.email} />}
    </div>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '../admin.css'
import { adminClient, isRememberingSession, rememberSession } from '../lib/adminClient'
import { useDragOrder } from '../hooks/useDragOrder'
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  loadMenu,
  reorderCategories,
  reorderProducts,
  setProductImage,
  subscribeToMenuChanges,
  updateCategory,
  updateProduct,
} from '../lib/adminApi'

const text = {
  title: 'إدارة المنيو',
  signIn: 'تسجيل الدخول',
  signOut: 'خروج',
  remember: 'تذكّرني على هذا الجهاز',
  rememberHint: 'اتركه بدون تحديد على جهاز مشترك — الجلسة تنتهي بإغلاق المتصفح.',
  email: 'البريد الإلكتروني',
  password: 'كلمة المرور',
  signingIn: 'جارٍ الدخول…',
  notAdmin: 'هذا الحساب ليس له صلاحية تعديل المنيو.',
  loading: 'جارٍ التحميل…',
  retry: 'إعادة المحاولة',
  price: 'السعر',
  currency: 'جنيه',
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
  nameEnPlaceholder: 'بالإنجليزية (اختياري)',
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
  manageCategories: 'إدارة التصنيفات',
  reorder: 'اسحب لتغيير الترتيب',
  reorderLocked: 'الترتيب متاح على القائمة كاملة — أغلق البحث والتصفية',
  reorderFailed: 'تعذّر حفظ الترتيب',
  addCategory: 'إضافة تصنيف',
  subtitleAr: 'الوصف بالعربية',
  subtitleEn: 'الوصف بالإنجليزية',
  optional: 'اختياري',
  categoryNote:
    'التصنيف الجديد يظهر على الموقع بمجرد أن يضم منتجاً واحداً ظاهراً. الإخفاء يرفع التصنيف بكل '
    + 'منتجاته عن الموقع دون حذف شيء، والحذف لا يتاح إلا بعد إفراغ التصنيف.',
  categoryHasProducts: 'أفرغ التصنيف من منتجاته قبل حذفه، أو أخفِه بدلاً من ذلك.',
  categoryHasHomeTile: 'هذا التصنيف يحمل بطاقة في الصفحة الرئيسية، وحذفه يحذفها معه.',
  removeCategory: 'حذف التصنيف',
  confirmRemoveCategory: (name) => `حذف تصنيف «${name}» نهائياً؟`,
  close: 'إغلاق',
  done: 'تم',
  productCount: (count) => {
    if (count === 0) return 'لا منتجات'
    if (count === 1) return 'منتج واحد'
    if (count === 2) return 'منتجان'
    if (count <= 10) return `${count} منتجات`
    return `${count} منتجاً`
  },
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
  // ?? rather than String(value): a missing English name would otherwise fold to "null" and
  // match a search for it.
  return String(value ?? '')
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

/**
 * The save lifecycle every editable row shares: run the write, show "saving" and then a tick,
 * and surface the message if it fails.
 *
 * `run` returns whether the write landed, so an optimistic control can put itself back if it
 * did not.
 */
function useRowSave(onChange) {
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)

  const run = useCallback(async (work) => {
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
  }, [onChange])

  return { state, error, run }
}

/** Drawn rather than typed: a braille or box-drawing grip glyph is at the mercy of the font. */
function DragGrip() {
  return (
    <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true" focusable="false">
      {[3, 8, 13].map((y) => [2.5, 7.5].map((x) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.35" fill="currentColor" />
      )))}
    </svg>
  )
}

/**
 * The control that starts a drag, and moves the row on its own with the arrow keys.
 *
 * A button, not a decorated div: reordering has to be reachable without a pointer, and a real
 * button gets focus, the keyboard and a screen-reader role for free.
 */
function DragHandle({ label, ...props }) {
  return (
    <button type="button" className="admin-drag-handle" title={text.reorder} aria-label={label} {...props}>
      <DragGrip />
    </button>
  )
}

/**
 * Text fields that edit a stored record in place and save on blur, the way the price does.
 *
 * Two things it has to get right. Stored values win, so another administrator's rename appears
 * here — except in the field being typed into at this moment: saving the Arabic name returns a
 * fresh row a moment after the cursor has moved on to the English one, and without that guard it
 * lands on top of the half-typed word there. And the Arabic name, which the database requires,
 * cannot be cleared: a blank one puts the stored value back instead of failing the write.
 */
function useDraftFields({ record, run, save }) {
  const [draft, setDraft] = useState(record)
  const editingRef = useRef(null)

  useEffect(() => {
    setDraft((current) => {
      const editing = editingRef.current
      return editing ? { ...record, [editing]: current[editing] } : record
    })
  }, [record])

  const commit = (name, required) => {
    const next = draft[name]?.trim() ?? ''
    const stored = record[name] ?? ''
    if (next === stored) return
    if (required && !next) {
      setDraft((current) => ({ ...current, [name]: record[name] }))
      return
    }
    run(() => save({ [name]: next === '' ? null : next }))
  }

  return (name, { required = false, ltr = false } = {}) => ({
    value: draft[name] ?? '',
    dir: ltr ? 'ltr' : undefined,
    onChange: (event) => setDraft((current) => ({ ...current, [name]: event.target.value })),
    onFocus: () => { editingRef.current = name },
    onBlur: () => { editingRef.current = null; commit(name, required) },
    onKeyDown: (event) => { if (event.key === 'Enter') event.currentTarget.blur() },
  })
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
  // Opens on the answer it was left on, so the choice is made once rather than every visit.
  const [remember, setRemember] = useState(isRememberingSession)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    // Before the sign-in, not after: signing in is the write that puts the session in a store,
    // and this is what decides which one.
    rememberSession(remember)
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
      <label className="admin-signin__remember">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        <span>{text.remember}</span>
      </label>
      {!remember && <p className="admin-signin__note">{text.rememberHint}</p>}
      {error && <p className="admin-error">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? text.signingIn : text.signIn}</button>
    </form>
  )
}

function ProductRow({ product, categoryName, onChange, onRemove, drag, canReorder }) {
  const [price, setPrice] = useState(String(product.price))
  // The checkbox answers the click immediately and only falls back to the stored value if the
  // write fails; without this it snaps back for the length of the round trip and reads as broken.
  const [published, setPublished] = useState(product.is_published)
  const { state, error, run } = useRowSave(onChange)
  const fileRef = useRef(null)
  // Stable, so a re-render mid-drag does not unregister the row the drag is measuring against.
  const setRowRef = useCallback((element) => drag.registerRow(product.id, element), [drag, product.id])
  const fieldProps = useDraftFields({
    record: product,
    run,
    // The slug is not derived again from the English name: it is what /menu#… and every saved
    // link point at, so a rename must never move it.
    save: (changes) => updateProduct(product.id, changes),
  })

  useEffect(() => { setPrice(String(product.price)) }, [product.price])
  useEffect(() => { setPublished(product.is_published) }, [product.is_published])

  const commitPrice = () => {
    const next = Number(price)
    if (!Number.isInteger(next) || next < 0 || next === product.price) {
      setPrice(String(product.price))
      return
    }
    run(() => updateProduct(product.id, { price: next }))
  }

  const canPublish = Boolean(product.image_url)
  const dropSide = drag.dropMarker(product.id)
  const rowClass = [
    published ? null : 'is-hidden-row',
    drag.dragId === product.id ? 'is-dragging' : null,
    dropSide ? `is-drop-${dropSide}` : null,
  ].filter(Boolean).join(' ') || undefined

  return (
    <tr ref={setRowRef} className={rowClass}>
      <td className="admin-cell-drag">
        {canReorder && <DragHandle label={`${text.reorder} — ${product.name_ar}`} {...drag.handleProps(product.id)} />}
      </td>

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
        <input
          className="admin-name-field"
          aria-label={`${text.nameAr} — ${product.name_ar}`}
          {...fieldProps('name_ar', { required: true })}
        />
        <input
          className="admin-name-field admin-name-field--en"
          aria-label={`${text.nameEn} — ${product.name_ar}`}
          placeholder={text.nameEnPlaceholder}
          {...fieldProps('name_en', { ltr: true })}
        />
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
                <option key={category.id} value={category.id}>
                  {category.is_published ? category.name_ar : `${category.name_ar} — ${text.hidden}`}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{text.nameAr}</span>
            <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} required autoFocus />
          </label>
          <label>
            <span>{text.nameEn} · {text.optional}</span>
            <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" />
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

/**
 * One category, editable in place.
 *
 * The four names save on blur, the way a price does — a category is renamed once in a blue moon,
 * and an explicit save button for four fields across ten rows is forty controls nobody needs.
 *
 * Deleting is only offered on an empty category. The database refuses it otherwise
 * (menu_products.category_id is ON DELETE RESTRICT), and that is the right answer: a section
 * should not be something thirty products can be lost to by one mis-click. Hiding is the move
 * for "take this off the site", and it leaves every product exactly where it is.
 *
 * A category carrying a homepage tile is off limits too, and that one the database does not
 * catch. Tea is empty precisely because its products moved into hot drinks — the row is still
 * there to keep its tile on the homepage, so the one category the button would happily delete
 * is the one deleting costs something.
 */
function CategoryRow({ category, onChange, onRemove, drag }) {
  const [published, setPublished] = useState(category.is_published)
  const { state, error, run } = useRowSave(onChange)
  const setRowRef = useCallback((element) => drag.registerRow(category.id, element), [drag, category.id])
  const fieldProps = useDraftFields({
    record: category,
    run,
    save: (changes) => updateCategory(category.id, changes),
  })

  useEffect(() => { setPublished(category.is_published) }, [category.is_published])

  const productCount = category.products.length
  const carriesHomeTile = Boolean(category.homepage_image_url)

  const field = (name, label, options) => (
    <label>
      <span>{options?.required ? label : `${label} · ${text.optional}`}</span>
      <input aria-label={`${label} — ${category.name_ar}`} {...fieldProps(name, options)} />
    </label>
  )

  const dropSide = drag.dropMarker(category.id)
  const rowClass = [
    'admin-category',
    published ? null : 'is-hidden',
    drag.dragId === category.id ? 'is-dragging' : null,
    dropSide ? `is-drop-${dropSide}` : null,
  ].filter(Boolean).join(' ')

  return (
    <li ref={setRowRef} className={rowClass}>
      <DragHandle label={`${text.reorder} — ${category.name_ar}`} {...drag.handleProps(category.id)} />

      <div className="admin-category__fields">
        {field('name_ar', text.nameAr, { required: true })}
        {field('name_en', text.nameEn, { ltr: true })}
        {field('subtitle_ar', text.subtitleAr)}
        {field('subtitle_en', text.subtitleEn, { ltr: true })}
      </div>

      <div className="admin-category__foot">
        <label className={`admin-switch${published ? ' is-on' : ''}`}>
          <input
            type="checkbox"
            checked={published}
            onChange={async (event) => {
              const next = event.target.checked
              setPublished(next)
              const saved = await run(() => updateCategory(category.id, { is_published: next }))
              if (!saved) setPublished(category.is_published)
            }}
          />
          <span className="admin-switch__track" aria-hidden="true"><span /></span>
          <span className="admin-switch__label">{published ? text.visible : text.hidden}</span>
        </label>

        <span className="admin-category__count">{text.productCount(productCount)}</span>

        <span className="admin-category__state">
          {state === 'saving' && <span className="admin-state">{text.saving}</span>}
          {state === 'saved' && <span className="admin-state is-ok">✓ {text.saved}</span>}
          {error && <span className="admin-error" role="alert">{error}</span>}
        </span>

        <button
          type="button"
          className="admin-icon-button"
          disabled={productCount > 0 || carriesHomeTile}
          title={productCount > 0
            ? text.categoryHasProducts
            : carriesHomeTile ? text.categoryHasHomeTile : text.removeCategory}
          aria-label={`${text.removeCategory} — ${category.name_ar}`}
          onClick={() => {
            if (window.confirm(text.confirmRemoveCategory(category.name_ar))) {
              run(async () => { await deleteCategory(category.id); onRemove(category.id); return null })
            }
          }}
        >
          ✕
        </button>
      </div>
    </li>
  )
}

/**
 * Every section the menu is divided into, on one screen: add, rename, hide, delete.
 *
 * A dialog rather than a third column, for the same reason adding a product is one — this is
 * something the owner does a few times a year, and it should not cost the product list any of
 * the width it uses every day.
 */
function ManageCategoriesDialog({ open, categories, onClose, onChange, onRemove, onCreated, onReorder }) {
  const dialogRef = useRef(null)
  const drag = useDragOrder({ ids: categories.map((category) => category.id), onCommit: onReorder })
  const [nameAr, setNameAr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      setNameAr(''); setNameEn(''); setError(null)
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onCreated(await createCategory({ nameAr: nameAr.trim(), nameEn: nameEn.trim() }))
      // Cleared rather than closed: adding a few sections in one sitting is the usual reason to be here.
      setNameAr('')
      setNameEn('')
    } catch (cause) {
      setError(cause.message)
    }
    setBusy(false)
  }

  return (
    <dialog
      ref={dialogRef}
      className="admin-dialog admin-dialog--wide"
      onClose={onClose}
      onClick={(event) => { if (event.target === dialogRef.current) onClose() }}
      aria-labelledby="admin-categories-title"
    >
      <div className="admin-dialog__body">
        <header className="admin-dialog__head">
          <h2 id="admin-categories-title">{text.manageCategories}</h2>
          <button type="button" className="admin-icon-button" onClick={onClose} aria-label={text.close}>✕</button>
        </header>

        <form className="admin-category-new" onSubmit={submit}>
          <label>
            <span>{text.nameAr}</span>
            <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} required placeholder="المخبوزات" />
          </label>
          <label>
            <span>{text.nameEn} · {text.optional}</span>
            <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" placeholder="Bakery" />
          </label>
          <button type="submit" disabled={busy}>{busy ? text.saving : text.addCategory}</button>
        </form>
        {error && <p className="admin-error" role="alert">{error}</p>}

        <p className="admin-dialog__note">{text.categoryNote}</p>

        <ul className="admin-category-list">
          {categories.map((category) => (
            <CategoryRow key={category.id} category={category} onChange={onChange} onRemove={onRemove} drag={drag} />
          ))}
        </ul>

        <div className="admin-dialog__actions">
          <button type="button" className="admin-link" onClick={onClose}>{text.done}</button>
        </div>
      </div>
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
  const [managing, setManaging] = useState(false)
  // Separate from the page-level error, which replaces the whole screen. A reorder that
  // did not save is worth a line above the list, not the loss of everything else on it.
  const [orderError, setOrderError] = useState(null)

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

  const replaceCategory = useCallback((updated) => {
    if (!updated) return
    setCategories((current) => current.map((category) => (
      category.id === updated.id ? { ...category, ...updated } : category
    )))
  }, [])

  const removeCategory = useCallback((categoryId) => {
    setCategories((current) => current.filter((category) => category.id !== categoryId))
  }, [])

  const addCategory = useCallback((created) => {
    setCategories((current) => [...current, created])
    // Open it, so closing the dialog lands on the empty section that now wants products.
    setActiveId(created.id)
    setQuery('')
  }, [])

  /**
   * Both of these move the rows on screen first and tell the database after. A reorder is a
   * gesture — waiting a round trip before the row lands where it was dropped reads as a failed
   * drag. If the write does fail, the optimistic order was a guess, so the answer is to refetch
   * rather than to try to reverse it.
   */
  const reorderProductsIn = useCallback((categoryId, ids) => {
    setOrderError(null)
    setCategories((current) => current.map((category) => {
      if (category.id !== categoryId) return category
      const byId = new Map(category.products.map((product) => [product.id, product]))
      return { ...category, products: ids.map((id) => byId.get(id)).filter(Boolean) }
    }))
    reorderProducts(ids).catch((cause) => {
      setOrderError(cause.message)
      load()
    })
  }, [load])

  const reorderCategoryList = useCallback((ids) => {
    setOrderError(null)
    setCategories((current) => {
      const byId = new Map(current.map((category) => [category.id, category]))
      return ids.map((id) => byId.get(id)).filter(Boolean)
    })
    reorderCategories(ids).catch((cause) => {
      setOrderError(cause.message)
      load()
    })
  }, [load])

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
   * Falls back to the first category rather than to nothing: the open one can disappear under
   * you — deleted in the categories dialog, or by another administrator while this tab watches.
   */
  const active = useMemo(
    () => categories?.find((category) => category.id === activeId) ?? categories?.[0] ?? null,
    [categories, activeId],
  )

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

    return (active?.products ?? [])
      .filter((product) => matchesFilter(product))
      .map((product) => ({ product, categoryName: null }))
  }, [categories, active, query, filter, searching])

  /**
   * Only the whole, unfiltered category can be reordered. What a search or a filter shows is a
   * subset, and dropping row 3 of 5 visible rows says nothing about where it belongs among the
   * thirty-two that are not.
   */
  const canReorder = !searching && filter === 'all'
  const productDrag = useDragOrder({
    ids: canReorder ? (active?.products ?? []).map((product) => product.id) : [],
    onCommit: (ids) => reorderProductsIn(active.id, ids),
    disabled: !canReorder,
  })

  if (error) {
    return (
      <div className="admin-empty">
        <p className="admin-error">{error}</p>
        <button type="button" onClick={load}>{text.retry}</button>
      </div>
    )
  }
  if (!categories) return <p className="admin-state admin-state--page">{text.loading}</p>

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
              const isActive = !searching && category.id === active?.id
              return (
                <li key={category.id}>
                  <button
                    type="button"
                    className={isActive ? 'is-active' : undefined}
                    aria-current={isActive ? 'true' : undefined}
                    onClick={() => { setActiveId(category.id); setQuery('') }}
                  >
                    <span>{category.name_ar}</span>
                    {/* A hidden category is off the site entirely, which matters more here than
                        how many of its products are published. */}
                    {category.is_published
                      ? <span className="admin-sidebar__count">{shown}/{category.products.length}</span>
                      : <span className="admin-sidebar__count is-hidden-flag">{text.hidden}</span>}
                  </button>
                </li>
              )
            })}
          </ul>

          <button type="button" className="admin-sidebar__manage" onClick={() => setManaging(true)}>
            <span aria-hidden="true">⚙</span> {text.manageCategories}
          </button>
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
            {!canReorder && visibleRows.length > 1 && (
              <span className="admin-scope__note">{text.reorderLocked}</span>
            )}
          </p>

          {orderError && (
            <p className="admin-error" role="alert">{text.reorderFailed} — {orderError}</p>
          )}

          {visibleRows.length === 0 ? (
            <p className="admin-state admin-state--empty">
              {searching || filter !== 'all' ? text.noResults : text.emptyCategory}
            </p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col"><span className="visually-hidden">{text.reorder}</span></th>
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
                    drag={productDrag}
                    canReorder={canReorder}
                  />
                ))}
              </tbody>
            </table>
          )}

        </section>
      </div>

      <ManageCategoriesDialog
        open={managing}
        categories={categories}
        onClose={() => setManaging(false)}
        onChange={replaceCategory}
        onRemove={removeCategory}
        onCreated={addCategory}
        onReorder={reorderCategoryList}
      />

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

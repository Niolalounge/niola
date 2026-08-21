import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '../admin.css'
import { adminClient } from '../lib/adminClient'
import {
  createProduct,
  deleteProduct,
  loadMenu,
  setProductImage,
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
  price: 'السعر',
  currency: 'ج.م',
  visible: 'ظاهر',
  hidden: 'مخفي',
  addProduct: 'إضافة منتج',
  nameAr: 'الاسم بالعربية',
  nameEn: 'الاسم بالإنجليزية',
  photo: 'الصورة',
  save: 'حفظ',
  saving: 'جارٍ الحفظ…',
  saved: 'تم الحفظ',
  cancel: 'إلغاء',
  remove: 'حذف',
  confirmRemove: 'حذف هذا المنتج نهائياً؟',
  changePhoto: 'تغيير الصورة',
  needsPhoto: 'يحتاج صورة قبل إظهاره',
  summary: (visible, total) => `${visible} ظاهر من ${total}`,
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

function ProductRow({ product, onChange, onRemove }) {
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
    <tr className={product.is_published ? undefined : 'is-hidden-row'}>
      <td className="admin-cell-photo">
        {product.image_url
          ? <img src={product.image_url} alt="" width="56" height="56" loading="lazy" />
          : <span className="admin-photo-empty" aria-hidden="true" />}
        <button type="button" className="admin-link" onClick={() => fileRef.current?.click()}>
          {product.image_url ? text.changePhoto : text.photo}
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
      <td>
        <strong>{product.name_ar}</strong>
        <span className="admin-name-en" dir="ltr">{product.name_en}</span>
      </td>
      <td className="admin-cell-price">
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
        <span>{text.currency}</span>
      </td>
      <td className="admin-cell-visible">
        <label className="admin-toggle">
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
          <span>{published ? text.visible : text.hidden}</span>
        </label>
        {!canPublish && !published && <span className="admin-hint">{text.needsPhoto}</span>}
      </td>
      <td className="admin-cell-state">
        {state === 'saving' && <span className="admin-state">{text.saving}</span>}
        {state === 'saved' && <span className="admin-state is-ok">{text.saved}</span>}
        {error && <span className="admin-error" role="alert">{error}</span>}
      </td>
      <td>
        <button
          type="button"
          className="admin-link is-danger"
          onClick={() => { if (window.confirm(text.confirmRemove)) run(async () => { await deleteProduct(product.id); onRemove(product.id); return null }) }}
        >
          {text.remove}
        </button>
      </td>
    </tr>
  )
}

function AddProduct({ categoryId, onCreated }) {
  const [open, setOpen] = useState(false)
  const [nameAr, setNameAr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [price, setPrice] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const reset = () => { setNameAr(''); setNameEn(''); setPrice(''); setFile(null); setError(null) }

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
      onCreated(created)
      if (created.uploadError) setError(created.uploadError)
      else { reset(); setOpen(false) }
    } catch (cause) {
      setError(cause.message)
    }
    setBusy(false)
  }

  if (!open) {
    return (
      <button type="button" className="admin-add-trigger" onClick={() => setOpen(true)}>
        + {text.addProduct}
      </button>
    )
  }

  return (
    <form className="admin-add" onSubmit={submit}>
      <label>
        <span>{text.nameAr}</span>
        <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} required />
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
      {error && <p className="admin-error" role="alert">{error}</p>}
      <div className="admin-add__actions">
        <button type="submit" disabled={busy}>{busy ? text.saving : text.save}</button>
        <button type="button" className="admin-link" onClick={() => { reset(); setOpen(false) }}>{text.cancel}</button>
      </div>
    </form>
  )
}

function Dashboard({ email }) {
  const [categories, setCategories] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadMenu().then(setCategories).catch((cause) => setError(cause.message))
  }, [])

  const replaceProduct = useCallback((categoryId, updated) => {
    if (!updated) return
    setCategories((current) => current.map((category) => (
      category.id === categoryId
        ? { ...category, products: category.products.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)) }
        : category
    )))
  }, [])

  const removeProduct = useCallback((categoryId, productId) => {
    setCategories((current) => current.map((category) => (
      category.id === categoryId
        ? { ...category, products: category.products.filter((p) => p.id !== productId) }
        : category
    )))
  }, [])

  const addProduct = useCallback((categoryId, created) => {
    setCategories((current) => current.map((category) => (
      category.id === categoryId
        ? { ...category, products: [...category.products, created] }
        : category
    )))
  }, [])

  const totals = useMemo(() => {
    if (!categories) return null
    const all = categories.flatMap((category) => category.products)
    return { visible: all.filter((p) => p.is_published).length, total: all.length }
  }, [categories])

  if (error) return <p className="admin-error">{error}</p>
  if (!categories) return <p className="admin-state">{text.loading}</p>

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div>
          <h1>{text.title}</h1>
          {totals && <p>{text.summary(totals.visible, totals.total)}</p>}
        </div>
        <div className="admin-header__account">
          <span dir="ltr">{email}</span>
          <button type="button" className="admin-link" onClick={() => adminClient.auth.signOut()}>{text.signOut}</button>
        </div>
      </header>

      {categories.map((category) => (
        <section key={category.id} className="admin-category">
          <h2>
            {category.name_ar}
            <span>{category.products.filter((p) => p.is_published).length} / {category.products.length}</span>
          </h2>

          <table className="admin-table">
            <tbody>
              {category.products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onChange={(updated) => replaceProduct(category.id, updated)}
                  onRemove={(id) => removeProduct(category.id, id)}
                />
              ))}
            </tbody>
          </table>

          <AddProduct categoryId={category.id} onCreated={(created) => addProduct(category.id, created)} />
        </section>
      ))}
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
      {session === undefined && <p className="admin-state">{text.loading}</p>}
      {session === null && <SignIn />}
      {session && isAdmin === null && <p className="admin-state">{text.loading}</p>}
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

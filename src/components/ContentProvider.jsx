import { useEffect, useMemo, useState } from 'react'
import { ContentContext } from '../context/ContentContext'
import { fetchGallery, fetchMenu, isSupabaseConfigured, staticContent } from '../lib/content'

/**
 * Supplies the menu and the gallery to the pages.
 *
 * State starts as the static content that used to be imported directly, so the first paint is
 * identical to the pre-database site — no spinner, no empty grid, no layout shift — and the
 * Supabase rows swap in when they arrive. If the request fails the static copy simply stays,
 * which is why a Supabase outage cannot blank the menu.
 */
export default function ContentProvider({ children }) {
  const [menu, setMenu] = useState(staticContent.menu)
  const [gallery, setGallery] = useState(staticContent.gallery)
  const [source, setSource] = useState(isSupabaseConfigured ? 'loading' : 'static')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined

    let cancelled = false

    Promise.all([fetchMenu(), fetchGallery()])
      .then(([liveMenu, liveGallery]) => {
        if (cancelled) return
        setMenu(liveMenu)
        setGallery(liveGallery)
        setSource('supabase')
      })
      .catch((cause) => {
        if (cancelled) return
        setSource('static')
        setError(cause)
        console.error('[niola] Supabase content unavailable, keeping the built-in menu.', cause)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(() => ({
    categories: menu.categories,
    homeTiles: menu.homeTiles,
    gallery,
    source,
    error,
  }), [menu, gallery, source, error])

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
}

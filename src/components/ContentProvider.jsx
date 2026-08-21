import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ContentContext } from '../context/ContentContext'
import { fetchGallery, fetchMenu, isSupabaseConfigured, staticContent } from '../lib/content'
import { subscribeToContentChanges } from '../lib/liveUpdates'

/**
 * Supplies the menu and the gallery to the pages.
 *
 * State starts as the static content that used to be imported directly, so the first paint is
 * identical to the pre-database site — no spinner, no empty grid, no layout shift — and the
 * Supabase rows swap in when they arrive. If the request fails the static copy simply stays,
 * which is why a Supabase outage cannot blank the menu.
 *
 * After the first load the provider subscribes to content_revision, so a price edited in the
 * dashboard reaches pages that are already open rather than waiting for a reload.
 */
export default function ContentProvider({ children }) {
  const [menu, setMenu] = useState(staticContent.menu)
  const [gallery, setGallery] = useState(staticContent.gallery)
  const [source, setSource] = useState(isSupabaseConfigured ? 'loading' : 'static')
  const [error, setError] = useState(null)
  const cancelledRef = useRef(false)

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) return
    try {
      const [liveMenu, liveGallery] = await Promise.all([fetchMenu(), fetchGallery()])
      if (cancelledRef.current) return
      setMenu(liveMenu)
      setGallery(liveGallery)
      setSource('supabase')
      setError(null)
    } catch (cause) {
      if (cancelledRef.current) return
      // Keep whatever is already on screen; a failed refresh must not blank a working menu.
      setSource((current) => (current === 'supabase' ? 'supabase' : 'static'))
      setError(cause)
      console.error('[niola] Supabase content unavailable, keeping the current menu.', cause)
    }
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    refresh()

    // Handles returning to a backgrounded tab as well: the watcher checks on visibility change
    // and only calls back when the content actually moved.
    const unsubscribe = subscribeToContentChanges(refresh)

    return () => {
      cancelledRef.current = true
      unsubscribe()
    }
  }, [refresh])

  const value = useMemo(() => ({
    categories: menu.categories,
    homeTiles: menu.homeTiles,
    gallery,
    source,
    error,
    refresh,
  }), [menu, gallery, source, error, refresh])

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
}

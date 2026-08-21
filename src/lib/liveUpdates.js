import { isSupabaseConfigured, selectFrom } from './supabase'

/**
 * Watches content_revision and calls back whenever the menu or the gallery changes, so an open
 * page updates itself instead of waiting for a reload.
 *
 * This polls rather than opening a websocket. Supabase's realtime client is ~54 kB gzipped, and
 * making every visitor to a lounge menu download it to learn about a price change a few times a
 * week is a bad trade; one 150-byte request every ten seconds costs nothing and needs no extra
 * JavaScript at all. The dashboard, which already loads supabase-js for authentication, does use
 * the websocket — see subscribeToMenuChanges in adminApi.js.
 *
 * Why content_revision and not menu_products: an anonymous visitor may only read published rows,
 * so hiding a product would be invisible to any per-row watcher — the single change most worth
 * pushing. The counter is readable by everyone, so the signal always arrives, and the client
 * refetches through its normal, RLS-filtered query.
 *
 * Polling stops while the tab is hidden and resumes with an immediate check, so a phone left in a
 * pocket is neither making requests nor showing a stale price when it comes back.
 *
 * @param {() => void} onChange called when the revision has moved
 * @returns {() => void} unsubscribe
 */
const POLL_INTERVAL_MS = 10_000

export function subscribeToContentChanges(onChange) {
  if (!isSupabaseConfigured) return () => {}

  let stopped = false
  let timer = null
  let lastSeen = null

  const check = async () => {
    if (stopped || document.visibilityState !== 'visible') return
    try {
      const [row] = await selectFrom('content_revision', { select: 'revision', limit: '1' })
      if (stopped || !row) return
      if (lastSeen !== null && row.revision !== lastSeen) onChange()
      lastSeen = row.revision
    } catch {
      // A failed poll is not worth reporting; the next one will either work or the page stays
      // on the content it already has.
    }
  }

  const start = () => {
    clearInterval(timer)
    timer = setInterval(check, POLL_INTERVAL_MS)
  }

  const onVisibility = () => {
    if (document.visibilityState === 'visible') { check(); start() } else clearInterval(timer)
  }

  check()
  start()
  document.addEventListener('visibilitychange', onVisibility)

  return () => {
    stopped = true
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}

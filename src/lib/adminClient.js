import { createClient } from '@supabase/supabase-js'

const REMEMBER_KEY = 'niola-admin-remember'

/**
 * "Remember me", which is a question about where the session is kept.
 *
 * Ticked, it goes to localStorage and outlives the browser closing — the dashboard is opened
 * from a phone between shifts, and a password asked for every time is a password that ends up
 * written down somewhere. Unticked, it goes to sessionStorage and leaves with the tab, which is
 * the answer on a borrowed or shared machine.
 *
 * The answer itself always lives in localStorage. It has to outlast the session it describes,
 * so the next visit can read the box back the way it was left — and so a session in
 * sessionStorage is still looked for in the right place after a reload.
 */
export function rememberSession(remember) {
  try {
    window.localStorage.setItem(REMEMBER_KEY, remember ? 'yes' : 'no')
  } catch {
    // Storage can be denied outright — a private window, or a browser set to block site data.
    // Nothing here is worth failing a sign-in over.
  }
}

export function isRememberingSession() {
  try {
    return window.localStorage.getItem(REMEMBER_KEY) !== 'no'
  } catch {
    return true
  }
}

const store = () => (isRememberingSession() ? window.localStorage : window.sessionStorage)

const sessionStorageAdapter = {
  getItem: (key) => {
    try { return store().getItem(key) } catch { return null }
  },
  setItem: (key, value) => {
    try { store().setItem(key, value) } catch { /* signing in still works, just not past today */ }
  },
  // Both stores, so signing out cannot leave a copy behind in the one not currently in use —
  // including the copy written before the box was last unticked.
  removeItem: (key) => {
    try { window.localStorage.removeItem(key) } catch { /* nothing to clear */ }
    try { window.sessionStorage.removeItem(key) } catch { /* nothing to clear */ }
  },
}

/**
 * The dashboard's Supabase client.
 *
 * Only src/pages/Admin.jsx imports this, and that page is lazy-loaded, so @supabase/supabase-js
 * lands in the admin chunk rather than the bundle every visitor downloads. The public pages talk
 * to PostgREST through src/lib/supabase.js with plain fetch and pull none of this in.
 */
export const adminClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'niola-admin-session',
      storage: sessionStorageAdapter,
    },
  },
)

export const MENU_IMAGE_BUCKET = 'menu-images'

import { createClient } from '@supabase/supabase-js'

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
    },
  },
)

export const MENU_IMAGE_BUCKET = 'menu-images'

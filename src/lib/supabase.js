const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * Reads a table through Supabase's PostgREST endpoint.
 *
 * The site makes two plain GET requests and never signs anyone in, so it talks to PostgREST
 * directly instead of pulling in @supabase/supabase-js — that library also carries auth,
 * realtime, storage and edge-function clients, none of which this site uses, and it more than
 * doubled the JavaScript bundle.
 *
 * @param {string} table
 * @param {Record<string, string>} params PostgREST query parameters, e.g. { select, order }.
 */
export async function selectFrom(table, params) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured')

  const query = new URLSearchParams(params).toString()
  const response = await fetch(`${url}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Supabase ${table} -> ${response.status} ${await response.text()}`)
  }

  return response.json()
}

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    '[niola] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — '
    + 'falling back to the static content in src/data. Copy .env.example to .env to use Supabase.',
  )
}

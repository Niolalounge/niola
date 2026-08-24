/**
 * Grants someone access to the /admin dashboard: creates their login in Supabase Auth and adds
 * the row in public.admin_users that the RLS policies actually check.
 *
 * Doing it by hand is two steps in two different places — Authentication → Users → Add user, then
 * an INSERT in the SQL editor — and forgetting the second one produces an account that signs in
 * and then sees an empty dashboard, which is confusing enough to be worth a script.
 *
 * Requires the service_role key: creating a user is an admin-API call, and admin_users has no
 * write policy at all, so nothing short of a key that bypasses RLS can do either half.
 * Pass it in the environment; never commit it and never put it in a VITE_ variable.
 *
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<secret> \
 *     node scripts/create-admin.mjs someone@example.com 'their-password'
 *
 * Re-running is safe. If the login already exists its password is reset to the one given, and the
 * admin_users row is upserted rather than duplicated.
 *
 * To revoke, delete the row — the login survives but matches no policy:
 *   delete from public.admin_users where email = 'someone@example.com';
 */

const url = process.env.SUPABASE_URL?.replace(/\/$/, '')
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const [email, password] = process.argv.slice(2)

if (!url || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.')
  console.error('Both come from Supabase Dashboard -> Project Settings -> API.')
  process.exit(1)
}

if (!email || !password) {
  console.error("Usage: node scripts/create-admin.mjs <email> '<password>'")
  process.exit(1)
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json',
}

async function call(path, { method = 'GET', body, prefer } = {}) {
  const response = await fetch(`${url}${path}`, {
    method,
    headers: prefer ? { ...headers, Prefer: prefer } : headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : null
  if (!response.ok) {
    const detail = payload?.message ?? payload?.msg ?? payload?.error_description ?? text
    const error = new Error(`${method} ${path} -> ${response.status} ${detail}`)
    error.status = response.status
    error.code = payload?.error_code ?? payload?.code
    error.detail = detail
    throw error
  }
  return payload
}

/** Walks the admin user list, because GoTrue has no "get user by email" endpoint. */
async function findUserByEmail(wanted) {
  const needle = wanted.toLowerCase()
  for (let page = 1; page <= 50; page += 1) {
    const { users = [] } = await call(`/auth/v1/admin/users?page=${page}&per_page=200`)
    const match = users.find((user) => user.email?.toLowerCase() === needle)
    if (match) return match
    if (users.length < 200) return null
  }
  return null
}

// ---- the login -----------------------------------------------------------

// email_confirm skips the verification mail: this account is being created by whoever owns the
// project, and an unconfirmed user cannot sign in with a password.
let user
try {
  user = await call('/auth/v1/admin/users', {
    method: 'POST',
    body: { email, password, email_confirm: true },
  })
  console.log(`auth user     created  ${user.email}  ${user.id}`)
} catch (cause) {
  const exists = cause.code === 'email_exists'
    || /already( been)? registered|already exists/i.test(cause.detail ?? '')
  if (!exists) throw cause

  const existing = await findUserByEmail(email)
  if (!existing) throw cause

  user = await call(`/auth/v1/admin/users/${existing.id}`, {
    method: 'PUT',
    body: { password, email_confirm: true },
  })
  console.log(`auth user     existed  ${user.email}  ${user.id}  (password reset)`)
}

// ---- the membership row --------------------------------------------------

try {
  await call('/rest/v1/admin_users?on_conflict=user_id', {
    method: 'POST',
    body: [{ user_id: user.id, email: user.email }],
    prefer: 'resolution=merge-duplicates,return=minimal',
  })
  console.log(`admin_users   granted  ${user.email}`)
} catch (cause) {
  console.error(`\nThe login exists but the admin_users row was not written:\n  ${cause.message}`)
  console.error('\nRun this in the Supabase SQL editor to finish:')
  console.error(`  insert into public.admin_users (user_id, email)\n  values ('${user.id}', '${user.email}')\n  on conflict (user_id) do nothing;`)
  process.exit(1)
}

console.log(`\nDone. Sign in at /admin with ${user.email}.`)

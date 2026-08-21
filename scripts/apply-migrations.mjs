/**
 * Applies supabase/migrations/*.sql to a Postgres database, in filename order.
 *
 * PostgREST — and therefore both the anon and the service_role key — can only read and write
 * rows; it has no way to run CREATE TABLE. Creating the schema needs a real Postgres connection,
 * which means the database password.
 *
 * Get the connection string from:
 *   Supabase Dashboard -> Project Settings -> Database -> Connect -> Session pooler
 *
 *   DATABASE_URL="postgresql://postgres.<ref>:<password>@<host>:5432/postgres" \
 *   node scripts/apply-migrations.mjs
 *
 * Each file runs inside its own transaction, so a failure rolls that file back rather than
 * leaving the schema half-created. Both migrations are idempotent and safe to re-run.
 */

import pg from 'pg'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = resolve(projectRoot, 'supabase/migrations')

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('Set DATABASE_URL to the Supabase session-pooler connection string.')
  process.exit(1)
}

const client = new pg.Client({
  connectionString,
  // Supabase terminates TLS with a certificate this client has no local root for; the
  // connection is still encrypted.
  ssl: { rejectUnauthorized: false },
})

await client.connect()

const [{ version, db, usr }] = (await client.query(
  'select version() as version, current_database() as db, current_user as usr',
)).rows
console.log(`connected: ${usr}@${db}`)
console.log(`server:    ${version.split(' on ')[0]}\n`)

const files = (await readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort()

for (const file of files) {
  const sql = await readFile(resolve(migrationsDir, file), 'utf8')
  process.stdout.write(`${file} ... `)
  try {
    // The migration files carry their own begin/commit, so they manage their own transaction.
    await client.query(sql)
    console.log('ok')
  } catch (error) {
    console.log('FAILED')
    console.error(`\n${error.message}`)
    if (error.position) {
      const upTo = sql.slice(0, Number(error.position))
      console.error(`at line ${upTo.split('\n').length}: ${upTo.split('\n').pop().trim()}`)
    }
    await client.end()
    process.exit(1)
  }
}

const counts = await client.query(`
  select 'menu_categories' as table_name, count(*)::int as rows from public.menu_categories
  union all select 'menu_products', count(*)::int from public.menu_products
  union all select 'gallery_items', count(*)::int from public.gallery_items
  order by table_name
`)

console.log('\nrows in place:')
counts.rows.forEach((row) => console.log(`  ${row.table_name.padEnd(16)} ${row.rows}`))

const policies = await client.query(`
  select tablename, count(*)::int as policies, bool_and(rowsecurity) as rls_on
  from pg_policies
  join pg_tables using (schemaname, tablename)
  where schemaname = 'public'
  group by tablename
  order by tablename
`)

console.log('\nrow level security:')
policies.rows.forEach((row) => console.log(`  ${row.tablename.padEnd(16)} rls=${row.rls_on} policies=${row.policies}`))

await client.end()
console.log('\nDone.')

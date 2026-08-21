# Supabase

The menu and the gallery live in Postgres. The site reads them with the anon key at runtime and
falls back to the copies in `src/data` if Supabase is unreachable, so an outage cannot blank the
menu.

## Tables

| Table | Holds |
| --- | --- |
| `menu_categories` | The 10 menu sections, their bilingual name and subtitle, their order, and the homepage tile fields |
| `menu_products` | All 115 items with bilingual names, price in EGP, image path and measured dimensions |
| `gallery_items` | The 6 gallery photographs with bilingual label and alt text |

Everything user-visible is stored as a pair of columns — `name_ar` / `name_en` — and the site
picks one by the active language.

## Editing content

Use the Supabase dashboard's table editor. The site picks changes up on the next page load; there
is no build step and nothing to redeploy.

- **Hide an item** — set `is_published = false`. It stays in the table with its price.
- **Publish an item** — it needs `image_url`, `image_width` and `image_height` first. A constraint
  enforces this, because a card without them shifts the layout while the photo loads.
- **Reorder** — edit `sort_order`; lower comes first. Leave gaps (10, 20, 30) so a row can move
  without renumbering its neighbours.
- **Delete a category** — move or delete its products first. The foreign key is `ON DELETE
  RESTRICT`, so the database refuses rather than silently taking 30 products with it.

66 of the 115 products are currently published. The other 49 are hidden because they have no
photograph yet; add one, fill in its dimensions, and flip `is_published`.

## Applying the schema

```bash
DATABASE_URL="postgresql://postgres.<ref>:<password>@<host>:5432/postgres" \
  node ../scripts/apply-migrations.mjs
```

The connection string comes from **Project Settings → Database → Connect → Session pooler**.
Migrations run in filename order, each in its own transaction, and all three are safe to re-run.

Neither the anon key nor the service_role key can do this — both are PostgREST tokens, and
PostgREST reads and writes rows but has no `CREATE TABLE`.

| File | What it does |
| --- | --- |
| `migrations/0001_schema.sql` | Tables, constraints, indexes, RLS policies, `updated_at` trigger |
| `migrations/0002_seed_content.sql` | The content, generated — do not edit by hand |
| `migrations/0003_harden.sql` | Narrows anon to `SELECT`; one gallery photo per grid slot |

## Regenerating the seed after editing `src/data`

```bash
node scripts/extract-content.mjs   # src/data -> supabase/content-source.json
node scripts/generate-seed.mjs     # -> migrations/0002_seed_content.sql
```

`extract-content.mjs` reads the real pixel dimensions out of each image file rather than trusting
a hand-maintained map, which is how it caught `red-tea-pot` being recorded as 1402×1122 when the
file is 1400×1123.

To push the same content over the REST API instead of running SQL:

```bash
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<secret> \
  node scripts/push-content.mjs
```

## The dashboard

`/admin` on the site itself. Sign in with the email and password of an account listed in
`admin_users`, and you can edit prices, add products with a photograph, and hide or show items.

Access is a row in `admin_users`, not a claim inside the login token, so removing someone takes
effect on their next request rather than whenever their session expires:

```sql
-- grant, for a user that already exists in Authentication → Users
insert into public.admin_users (user_id, email)
select id, email from auth.users where email = 'someone@example.com';

-- revoke
delete from public.admin_users where email = 'someone@example.com';
```

Create the account itself under **Authentication → Users → Add user** in the Supabase dashboard.
Self-signup is not wired up, so there is no way to grant yourself access from the browser.

What the dashboard enforces, and why the database enforces it too:

- A product needs a photograph before it can be published. `menu_products_publishable` rejects the
  write regardless of what the page sends.
- A new product is created hidden (`is_published` defaults to false), so a half-entered row cannot
  reach the live site.
- Uploads go to the `menu-images` bucket, capped at 5 MB, PNG/JPEG/WebP/AVIF only. The page
  measures each file and stores its real dimensions, the same rule the seed follows.

`/admin` is disallowed in `robots.txt` and the page adds `noindex, nofollow`.

## Security

Row Level Security is on for all three tables, with one policy each: `SELECT` on published rows,
for `anon` and `authenticated`. There is no insert, update or delete policy, so the public key
cannot write.

`0003_harden.sql` additionally revokes the write privileges Supabase grants by default. RLS
already reduced them to zero rows, but `TRUNCATE` is not subject to RLS at all — a role holding
that grant can empty an RLS-protected table regardless of its policies. It was never reachable
over HTTP, since PostgREST does not expose `TRUNCATE`, but the grant is gone so the schema no
longer rests on a single control.

The anon key is public by design and ships inside the JavaScript bundle. The service_role key and
the database password must never appear in a `VITE_` variable — Vite inlines those into files the
browser downloads.

## Known coupling to CSS

Three things in the database name a CSS rule, so adding a row is not always enough on its own:

- `menu_categories.slug` — `src/index.css` sets a per-category image aspect ratio via
  `.menu-section[data-category='<slug>']`. A new category renders 1:1 until a rule is added.
- `gallery_items.layout` — only `niola-coffee`, `niola-dayout`, `niola-nile` and `special-times`
  have a grid slot. Other values land in the lead block, ordered by `sort_order`.
- The homepage tile grid expects a multiple of four or five tiles; other counts leave a gap in the
  last row.

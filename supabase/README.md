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

Use the dashboard at `/admin`, or Supabase's own table editor. Either way the change reaches pages
that are **already open** within about ten seconds — no reload, no build step, nothing to redeploy.

How that works, and why it is not a websocket on the public site:

Every write to `menu_categories`, `menu_products` or `gallery_items` fires a statement-level
trigger that increments a counter in `content_revision`. Open pages watch that counter and refetch
when it moves.

The counter exists because the obvious approach has a hole. Realtime applies RLS per subscriber,
so hiding a product produces an UPDATE whose new row an anonymous visitor is not allowed to see —
no event is delivered, and the product stays on their screen. The one change most worth pushing is
the one that would silently fail. `content_revision` is readable by everyone, so the signal always
arrives, and the client then refetches through its normal RLS-filtered query.

The public site polls that counter every ten seconds while the tab is visible, rather than opening
a websocket: `@supabase/supabase-js` is ~54 kB gzipped, and making every visitor download it to
learn about a price change a few times a week is a bad trade — one 150-byte request is not. The
`/admin` dashboard, which already loads the library to sign in, does use the websocket, so two
administrators see each other's edits immediately.

- **Hide an item** — set `is_published = false`. It stays in the table with its price.
- **Publish an item** — it needs `image_url`, `image_width` and `image_height` first. A constraint
  enforces this, because a card without them shifts the layout while the photo loads.
- **Reorder** — edit `sort_order`; lower comes first. Leave gaps (10, 20, 30) so a row can move
  without renumbering its neighbours.
- **Hide a category** — set `is_published = false`. Its products go with it: the products
  policy checks the category's flag too, so they leave the API rather than staying individually
  fetchable.
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
| `migrations/0004_admin.sql` | `admin_users`, write policies for administrators, the image bucket |
| `migrations/0005_realtime.sql` | `content_revision` and the triggers that drive live updates |
| `migrations/0006_manage_categories.sql` | Lets administrators add, rename, hide and delete categories |

## Regenerating the seed after editing `src/data`

```bash
node scripts/extract-content.mjs   # src/data -> supabase/content-source.json
node scripts/generate-seed.mjs     # -> migrations/0002_seed_content.sql
```

`extract-content.mjs` reads the real pixel dimensions out of each image file rather than trusting
a hand-maintained map, which is how it caught `red-tea-pot` being recorded as 1402×1122 when the
file is 1400×1123.

To check the database still matches that file — after a migration, a bulk edit, or when something
on the site looks wrong:

```bash
DATABASE_URL="…" node scripts/verify-content.mjs            # report differences, exit 1 if any
DATABASE_URL="…" node scripts/verify-content.mjs --repair   # write the source values back
```

It compares every field of every category, product and gallery item, and lists products that exist
only in the database because someone added them through the dashboard.

To push the same content over the REST API instead of running SQL:

```bash
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<secret> \
  node scripts/push-content.mjs
```

## The dashboard

`/admin` on the site itself. Sign in with the email and password of an account listed in
`admin_users`, and you can edit prices, add products with a photograph, and hide or show items.

One category is on screen at a time — the sidebar picks it, and 115 rows at once is what made the
first version unreadable. Above it, four counters (total, visible, hidden, without a photo) and:

- **Search** — types across the *whole* menu, not just the open category, so you do not have to
  remember where a product is filed. Arabic letter forms are folded, so `اسبريسو` finds `إسبريسو`
  and `شاى` finds `شاي`. English names match too.
- **Filters** — all / visible / hidden / without a photo. They combine with the search.

**إضافة منتج** sits in the toolbar and opens a dialog, so it is reachable without scrolling past
the list and works while a search is open. The dialog carries its own category picker, defaulting
to whichever category is on screen; after saving, the list jumps to that category so the new row
is visible. Escape, the backdrop and the close button all dismiss it.

**إدارة التصنيفات**, under the sidebar, opens the sections themselves: add one, rename any of the
four names in place, hide one, delete an empty one. Names save on blur, the way a price does.

A few things follow from the schema rather than from the page:

- **Renaming is always safe.** The slug is the public identifier — `/menu#tea` and every link
  anyone has saved point at it — and renaming never touches it.
- **A new category is invisible until it has a published product**, because `fetchMenu` drops
  empty categories rather than rendering a section with a "00" count.
- **A new category's product images render 1:1** until `src/index.css` gets a
  `.menu-section[data-category='<slug>']` ratio for it. See *Known coupling to CSS* below.
- **Delete is only offered on an empty category**, matching `ON DELETE RESTRICT`. Hiding is the
  answer for everything else, and it keeps every product and every price.

Access is a row in `admin_users`, not a claim inside the login token, so removing someone takes
effect on their next request rather than whenever their session expires.

Granting access is two steps — the login, then the membership row — and `create-admin.mjs` does
both. Re-running it resets the password of an account that already exists, so it doubles as the
way to change one:

```bash
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<secret>   node scripts/create-admin.mjs someone@example.com 'their-password'
```

By hand instead: create the account under **Authentication → Users → Add user**, then

```sql
-- grant, for a user that already exists in Authentication → Users
insert into public.admin_users (user_id, email)
select id, email from auth.users where email = 'someone@example.com';

-- revoke — the login survives, it just stops matching any policy
delete from public.admin_users where email = 'someone@example.com';
```

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

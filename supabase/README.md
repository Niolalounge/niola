# Supabase

The menu and the gallery live in Postgres. The site reads them with the anon key at runtime and
falls back to the copies in `src/data` if Supabase is unreachable, so an outage cannot blank the
menu.

## Tables

| Table | Holds |
| --- | --- |
| `menu_categories` | 10 rows — 9 menu sections plus the folded `tea` row, their bilingual name and subtitle, their order, and the homepage tile fields |
| `menu_products` | All 115 items with bilingual names, price in EGP, image path and measured dimensions |
| `gallery_items` | The 6 gallery photographs with bilingual label and alt text |

Everything user-visible is stored as a pair of columns — `name_ar` / `name_en` — and the site
picks one by the active language.

`name_en` is optional, on products and on categories alike. Not everything Niola serves has an
English name anyone has settled on, and a form that insists on one gets a translation invented at
the keyboard. Where it is missing the site shows the Arabic name to English visitors — the item
under a name it actually has, rather than a card with nothing written on it. `name_ar` stays
required: a product needs at least one name.

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

- **Name it in Arabic only** — leave `name_en` blank and the English site falls back to the
  Arabic name. Filling it in later changes nothing else; the slug never moves.
- **Hide an item** — set `is_published = false`. It stays in the table with its price.
- **Publish an item** — it needs `image_url`, `image_width` and `image_height` first. A constraint
  enforces this, because a card without them shifts the layout while the photo loads.
- **Reorder** — drag it in the dashboard, or edit `sort_order` directly; lower comes first.
  Rows are numbered 10, 20, 30 …, and a drag renumbers the whole list rather than trying to
  squeeze a value between two neighbours.
- **Hide a category** — set `is_published = false`. Its products go with it: the products
  policy checks the category's flag too, so they leave the API rather than staying individually
  fetchable.
- **Delete a category** — move or delete its products first. The foreign key is `ON DELETE
  RESTRICT`, so the database refuses rather than silently taking 30 products with it.
- **`tea` is not a section any more.** 0008 folded its nine products into `hot-drinks`, where
  they sit at the top of the list. The row stays behind, empty and published, because it holds
  the homepage tile with the karak photograph — `CATEGORY_ALIASES` in `src/lib/content.js`
  points that tile, and every `/menu#tea` link saved before the fold, at `hot-drinks`. It is
  the one empty category the dashboard must not be allowed to delete: deleting it takes the
  tile with it and the homepage drops to eight.

Before 0007, every product added through the dashboard kept the column default of `sort_order =
0`; twenty of them ended up tied, and rows that tie come back from Postgres in whatever order it
likes — which can differ between two requests. Those products had no fixed position on the site at
all. 0007 gave every row a distinct number and `createProduct` now places each new one at the end.

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
| `migrations/0007_ordering.sql` | `reorder_*` functions, and one-off numbering for rows that tied |
| `migrations/0008_fold_tea_into_hot_drinks.sql` | Moves the tea products into `hot-drinks`, ahead of the hot cider |
| `migrations/0009_optional_english_name.sql` | Drops `not null` from `name_en` on products and categories |

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
Delete stays disabled on `tea`, which is empty but holds a homepage tile — the button says so.

**Editing a product** happens in the row itself: both names and the price save on blur, and the
visibility switch answers the click immediately. The English name may be left empty — clearing it
stores a null, and the site reads the Arabic name in its place. Clearing the Arabic one puts the
stored value back, because the database will not take the write. The name fields are deliberately borderless
until hovered — the table is read far more often than it is edited, and 26 rows of visible form
controls stop reading as a menu. Renaming never touches the slug, so /menu links keep working.

**Reordering** is a drag from the grip at the start of each row — products in the table,
categories in that dialog. Some notes on how it works, since none of it is the obvious choice:

- It is Pointer Events, not the HTML5 drag-and-drop API, which never fires on touch at all.
- The drag starts on the grip and nowhere else, so a finger anywhere else on a row still scrolls.
  `touch-action: none` on the grip is load-bearing: without it the browser claims the gesture and
  no `pointermove` is ever delivered.
- The list parts as you carry a row over it: every row the drag has passed slides up or down by
  one slot, so the gap under your finger is the place the row will take. The array itself is not
  touched until you let go, and it is spliced once.
- Where it lands is measured against the list as it would sit with nothing moved — each row is
  read back through whatever transform it is currently carrying. Hit-testing the rows where they
  have just slid to would put the ground in motion under the measurement that moves it.
- The grip is a button, so **arrow keys move a row** without a pointer.
- Dragging is off while a search or a filter is on, and the panel says so. What you can see then
  is a subset, and dropping row 3 of 5 visible rows says nothing about where it belongs among the
  32 that are not.
- The write is `reorder_menu_categories(ids)` / `reorder_menu_products(ids)` — the ids in their
  new order, renumbered in a single statement. Atomic, touches no column but `sort_order` (so it
  cannot clobber a price someone else is editing), and because the `content_revision` trigger is
  `FOR EACH STATEMENT`, reordering 32 products sends open browsers one event rather than 32.
  Both are `SECURITY INVOKER`, so RLS still decides: a non-administrator's call succeeds and
  changes nothing.
- Ids left out of the array keep their position, which is what makes it safe to send one
  category's products rather than the whole menu.

The homepage tile order is a separate list — `homepage_sort_order`, nine of the categories — and
is not editable from the dashboard yet.

A few things follow from the schema rather than from the page:

- **Renaming is always safe.** The slug is the public identifier — `/menu#coffee` and every
  link anyone has saved point at it — and renaming never touches it.
- **A new category is invisible until it has a published product**, because `fetchMenu` drops
  empty categories rather than rendering a section with a "00" count.
- **A new category's product images render 1:1** until `src/index.css` gets a
  `.menu-section[data-category='<slug>']` ratio for it. See *Known coupling to CSS* below.
- **Delete is only offered on an empty category** that carries no homepage tile. The first half
  matches `ON DELETE RESTRICT`; the second is the dashboard’s own rule, since nothing in the
  schema stops a tile being deleted along with the row holding it. Hiding is the answer for
  everything else, and it keeps every product and every price.

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

-- Niola Lounge — content schema
--
-- Holds the bilingual menu and the gallery that the public site renders. The site reads this
-- with the anon key, so every table is protected by RLS: anonymous visitors may read published
-- rows and nothing else. All writes go through the Supabase dashboard (service role).
--
-- Run this once, then run 0002_seed_content.sql.

begin;

-- ---------------------------------------------------------------------------
-- updated_at bookkeeping
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger helper: stamps updated_at on every UPDATE.';

-- ---------------------------------------------------------------------------
-- menu_categories
-- ---------------------------------------------------------------------------

create table if not exists public.menu_categories (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique
                          constraint menu_categories_slug_format
                          check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_ar               text not null check (length(btrim(name_ar)) > 0),
  name_en               text not null check (length(btrim(name_en)) > 0),
  subtitle_ar           text,
  subtitle_en           text,
  sort_order            integer not null default 0,
  is_published          boolean not null default true,

  -- The menu grid reserves each product's box before its image loads. These are the per-category
  -- defaults used when a product has no measured size of its own.
  default_image_width   integer check (default_image_width > 0),
  default_image_height  integer check (default_image_height > 0),

  -- The homepage shows a subset of categories as tiles, with their own hero image and their own
  -- English label (the menu says "Iced Drinks"; the homepage tile says "Iced Coffee").
  homepage_image_url    text,
  homepage_name_ar      text,
  homepage_name_en      text,
  homepage_sort_order   integer,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- A tile is only renderable with both an image and a position; allow neither or both.
  constraint menu_categories_homepage_tile_complete check (
    (homepage_image_url is null and homepage_sort_order is null)
    or (homepage_image_url is not null and homepage_sort_order is not null)
  )
);

comment on table public.menu_categories is
  'Menu categories (Coffee, Tea, ...). slug is the public identifier used in /menu#<slug>.';
comment on column public.menu_categories.sort_order is
  'Display order on the menu page; lower comes first. Deliberately not unique — the dashboard '
  'saves one row per transaction, so a unique constraint would reject the first half of a swap. '
  'Leave gaps (10, 20, 30) so a row can be moved without renumbering its neighbours.';
comment on column public.menu_categories.is_published is
  'Unpublished categories are hidden from the site but keep their products.';
comment on column public.menu_categories.homepage_sort_order is
  'Order among the homepage category tiles. NULL means this category has no homepage tile.';

create index if not exists menu_categories_published_order_idx
  on public.menu_categories (sort_order)
  where is_published;

create index if not exists menu_categories_homepage_order_idx
  on public.menu_categories (homepage_sort_order)
  where is_published and homepage_sort_order is not null;

drop trigger if exists menu_categories_set_updated_at on public.menu_categories;
create trigger menu_categories_set_updated_at
  before update on public.menu_categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- menu_products
-- ---------------------------------------------------------------------------

create table if not exists public.menu_products (
  id            uuid primary key default gen_random_uuid(),
  -- RESTRICT, not CASCADE: this table is edited by hand in the Supabase dashboard, where there
  -- is no undo. Deleting a category should refuse while it still holds products rather than
  -- silently taking 30 of them with it.
  category_id   uuid not null references public.menu_categories (id) on delete restrict,

  -- Product slugs are unique across the whole menu, not just within a category, so they stay
  -- stable if a product is moved between categories.
  slug          text not null unique
                  constraint menu_products_slug_format
                  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_ar       text not null check (length(btrim(name_ar)) > 0),
  name_en       text not null check (length(btrim(name_en)) > 0),

  -- Whole Egyptian pounds. Nothing on the menu has ever been priced in piastres, and an integer
  -- keeps arithmetic and display exact.
  price         integer not null check (price >= 0),

  image_url     text,
  image_width   integer check (image_width > 0),
  image_height  integer check (image_height > 0),

  sort_order    integer not null default 0,
  is_published  boolean not null default true,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- The menu card always renders an <img> with explicit width/height, so a published product
  -- must carry all three or it would shift the layout as it loads.
  constraint menu_products_publishable check (
    not is_published
    or (image_url is not null and image_width is not null and image_height is not null)
  ),
  constraint menu_products_image_dimensions_paired check (
    (image_url is null and image_width is null and image_height is null)
    or (image_url is not null and image_width is not null and image_height is not null)
  )
);

comment on table public.menu_products is
  'Menu items. Set is_published = false to hide one without deleting it (keeps its price history).';
comment on column public.menu_products.price is
  'Whole Egyptian pounds (EGP). No decimals.';
comment on column public.menu_products.is_published is
  'Only published products appear on the site. A product needs an image and its dimensions to be published.';
comment on column public.menu_products.image_width is
  'The image file''s real pixel width — rendered as <img width> to reserve the box and avoid layout shift.';

create index if not exists menu_products_category_order_idx
  on public.menu_products (category_id, sort_order);

create index if not exists menu_products_published_idx
  on public.menu_products (category_id, sort_order)
  where is_published;

drop trigger if exists menu_products_set_updated_at on public.menu_products;
create trigger menu_products_set_updated_at
  before update on public.menu_products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- gallery_items
-- ---------------------------------------------------------------------------

create table if not exists public.gallery_items (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique
                     constraint gallery_items_slug_format
                     check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  label_ar         text not null check (length(btrim(label_ar)) > 0),
  label_en         text not null check (length(btrim(label_en)) > 0),
  -- Alt text is required: the gallery is the page's entire content, so an empty alt would make
  -- it unreadable to a screen reader.
  alt_ar           text not null check (length(btrim(alt_ar)) > 0),
  alt_en           text not null check (length(btrim(alt_en)) > 0),

  image_url        text not null,
  image_width      integer not null check (image_width > 0),
  image_height     integer not null check (image_height > 0),

  -- CSS hooks the Gallery page already understands: `layout` selects the editorial grid slot
  -- (.gallery-card--<layout>) and `object_position` frames the crop.
  layout           text not null,
  object_position  text not null default '50% 50%',

  sort_order       integer not null default 0,
  is_published     boolean not null default true,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.gallery_items is
  'Gallery page images, in display order.';
comment on column public.gallery_items.layout is
  'Grid slot name; the page renders class "gallery-card--<layout>". Must match a rule in App.css.';
comment on column public.gallery_items.object_position is
  'CSS object-position, e.g. "52% 58%" — controls how the image is cropped inside its card.';

create index if not exists gallery_items_published_order_idx
  on public.gallery_items (sort_order)
  where is_published;

drop trigger if exists gallery_items_set_updated_at on public.gallery_items;
create trigger gallery_items_set_updated_at
  before update on public.gallery_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Enabling RLS without a policy denies everything; each table then gets exactly one policy,
-- for SELECT only. No INSERT/UPDATE/DELETE policy exists, so anon and authenticated callers
-- cannot write at all. The service_role key bypasses RLS, which is how the dashboard edits.
--
-- Deliberately NOT using FORCE ROW LEVEL SECURITY: force applies RLS to the table owner as
-- well, and the owner is the role that runs these migrations and the dashboard table editor.
-- With no INSERT policy, forcing it would lock the owner out of its own tables.
-- ---------------------------------------------------------------------------

alter table public.menu_categories enable row level security;
alter table public.menu_products   enable row level security;
alter table public.gallery_items   enable row level security;

drop policy if exists "published categories are public" on public.menu_categories;
create policy "published categories are public"
  on public.menu_categories
  for select
  to anon, authenticated
  using (is_published);

-- A product is only visible if its category is too, so unpublishing a category hides its
-- products from the API rather than leaving them individually fetchable.
drop policy if exists "published products are public" on public.menu_products;
create policy "published products are public"
  on public.menu_products
  for select
  to anon, authenticated
  using (
    is_published
    and exists (
      select 1
      from public.menu_categories c
      where c.id = menu_products.category_id
        and c.is_published
    )
  );

drop policy if exists "published gallery items are public" on public.gallery_items;
create policy "published gallery items are public"
  on public.gallery_items
  for select
  to anon, authenticated
  using (is_published);

commit;

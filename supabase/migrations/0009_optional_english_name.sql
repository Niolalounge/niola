-- Niola Lounge — the English name becomes optional
--
-- Every name was required in both languages, which is a rule about the menu rather than about the
-- database: plenty of what Niola serves is only ever written in Arabic, and asking for an English
-- name that nobody has decided on yet gets one invented at the keyboard to satisfy a form.
--
-- The Arabic name stays required. It is the name the menu is written in, and a product needs at
-- least one. What the site does without the English one is fall back to the Arabic, so an English
-- visitor sees the item under its own name rather than an unnamed card — src/lib/content.js.
--
-- Safe to re-run.

begin;

alter table public.menu_products
  alter column name_en drop not null;
alter table public.menu_products
  drop constraint if exists menu_products_name_en_check;

alter table public.menu_categories
  alter column name_en drop not null;
alter table public.menu_categories
  drop constraint if exists menu_categories_name_en_check;

-- To a fallback that asks "is there an English name", an empty string answers yes and then renders
-- nothing. Only the dropped constraint kept those out; make sure none arrive from anywhere else.
update public.menu_products
   set name_en = null
 where name_en is not null and btrim(name_en) = '';

update public.menu_categories
   set name_en = null
 where name_en is not null and btrim(name_en) = '';

comment on column public.menu_products.name_en is
  'Optional. The site shows name_ar in English when this is null.';
comment on column public.menu_categories.name_en is
  'Optional. The site shows name_ar in English when this is null.';

commit;

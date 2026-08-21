-- Niola Lounge — hardening pass
--
-- Two defects found by reviewing 0001 against the live project:
--
--   1. Supabase's bootstrap grants anon and authenticated ALL privileges on new public tables —
--      INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER. Row Level Security holds every one
--      of them to zero rows today, so nothing is currently exposed. But TRUNCATE is not subject
--      to RLS at all (verified: a role with the grant empties an RLS-protected table regardless
--      of its policies), which leaves the whole schema resting on a single control. PostgREST
--      does not expose TRUNCATE over HTTP, so this was never reachable with the anon key — it is
--      removed so that a future mistake, such as a table shipped with RLS off, cannot become a
--      data-loss bug.
--
--   2. gallery_items.layout names a CSS grid slot. Two rows sharing one slot stack in the same
--      grid area and one photograph becomes invisible, with no error anywhere.
--
-- Safe to re-run.

begin;

-- ---------------------------------------------------------------------------
-- 1. Read-only really means read-only
-- ---------------------------------------------------------------------------

revoke all on public.menu_categories from anon, authenticated;
revoke all on public.menu_products   from anon, authenticated;
revoke all on public.gallery_items   from anon, authenticated;

grant select on public.menu_categories to anon, authenticated;
grant select on public.menu_products   to anon, authenticated;
grant select on public.gallery_items   to anon, authenticated;

-- Tables added to this schema later start read-only too, instead of inheriting the
-- grant-everything default and relying on someone remembering to enable RLS.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public grant select on tables to anon, authenticated;

-- service_role keeps full access; it is what the dashboard and scripts/push-content.mjs use.
grant all on public.menu_categories, public.menu_products, public.gallery_items to service_role;

-- ---------------------------------------------------------------------------
-- 2. One gallery photo per grid slot
-- ---------------------------------------------------------------------------

create unique index if not exists gallery_items_layout_key
  on public.gallery_items (layout);

comment on column public.gallery_items.layout is
  'Grid slot name; the page renders class "gallery-card--<layout>". Unique, because two rows in '
  'one slot overlap and hide a photo. Only slots with a rule in src/index.css are positioned: '
  'niola-coffee, niola-dayout, niola-nile, special-times. Rows with any other layout fall into '
  'the lead block and are placed by sort_order (today: nile-view, luxurious-atmosphere).';

commit;

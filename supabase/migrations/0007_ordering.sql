-- Niola Lounge — reordering
--
-- Two problems, one migration.
--
-- The first is a bug. menu_products.sort_order defaults to 0 and the dashboard never set it, so
-- every product added since the seed sits at 0 alongside its neighbours. Ordering by a column
-- where seventeen rows tie leaves Postgres free to return them in any order it likes, and it may
-- return a different one on the next request — so those products have no fixed position on the
-- site at all. The tail of this file gives every row an explicit, distinct number.
--
-- The second is the feature. Moving a row means renumbering, because the categories are numbered
-- 0..9 with no gaps and there is no integer to move one into. Doing that from the client would
-- be one request per row, non-atomic, and would have to send every NOT NULL column back — which
-- means a reorder could overwrite a price another administrator is editing at that moment.
--
-- So the renumbering happens here instead: one function per table, taking the ids in their new
-- order and rewriting sort_order in a single statement. Atomic, touches no other column, and
-- because the content_revision trigger is FOR EACH STATEMENT, reordering thirty products sends
-- open browsers one event rather than thirty.

begin;

-- ---------------------------------------------------------------------------
-- Reordering
--
-- SECURITY INVOKER — the default, and deliberate here, unlike is_admin() and
-- bump_content_revision() which must escape the caller's rights. These run as whoever called
-- them, so Row Level Security still decides which rows they may touch: an administrator's UPDATE
-- matches every row, anyone else's matches none and the call silently does nothing.
-- ---------------------------------------------------------------------------

create or replace function public.reorder_menu_categories(ids uuid[])
returns void
language sql
set search_path = ''
as $$
  update public.menu_categories c
     set sort_order = (i.ord * 10)::integer
    from unnest(ids) with ordinality as i(id, ord)
   where c.id = i.id
     and c.sort_order is distinct from (i.ord * 10)::integer;
$$;

comment on function public.reorder_menu_categories(uuid[]) is
  'Renumbers menu_categories.sort_order to match the order of the given ids. Ids not listed are '
  'left alone. RLS applies, so only an administrator changes anything.';

create or replace function public.reorder_menu_products(ids uuid[])
returns void
language sql
set search_path = ''
as $$
  update public.menu_products p
     set sort_order = (i.ord * 10)::integer
    from unnest(ids) with ordinality as i(id, ord)
   where p.id = i.id
     and p.sort_order is distinct from (i.ord * 10)::integer;
$$;

comment on function public.reorder_menu_products(uuid[]) is
  'Renumbers menu_products.sort_order to match the order of the given ids. The caller passes one '
  'category''s products; ids not listed are left alone. RLS applies.';

revoke all on function public.reorder_menu_categories(uuid[]) from public;
revoke all on function public.reorder_menu_products(uuid[]) from public;
grant execute on function public.reorder_menu_categories(uuid[]) to authenticated;
grant execute on function public.reorder_menu_products(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Give every existing row a position of its own
--
-- Ties are broken by created_at: for the rows that need it these were all added from the
-- dashboard, so insertion order is the closest thing to an intended order that exists. slug is
-- the final tiebreaker so the result is the same however many times this runs.
--
-- The `is distinct from` guard makes re-running a no-op rather than a rewrite of every row.
-- ---------------------------------------------------------------------------

with ordered as (
  select id, (row_number() over (order by sort_order, created_at, slug) * 10)::integer as target
  from public.menu_categories
)
update public.menu_categories c
   set sort_order = ordered.target
  from ordered
 where ordered.id = c.id
   and c.sort_order is distinct from ordered.target;

with ordered as (
  select
    id,
    (row_number() over (partition by category_id order by sort_order, created_at, slug) * 10)::integer as target
  from public.menu_products
)
update public.menu_products p
   set sort_order = ordered.target
  from ordered
 where ordered.id = p.id
   and p.sort_order is distinct from ordered.target;

commit;

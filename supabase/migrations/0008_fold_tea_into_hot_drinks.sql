-- Niola Lounge — fold tea into hot drinks
--
-- Two sections were saying the same thing: a cup of something hot. Tea's nine products move into
-- hot drinks and take the top of the list, ahead of the hot cider.
--
-- The tea row itself stays. With no products left it stops rendering — fetchMenu drops empty
-- categories, so the menu page shows nine sections instead of ten — but the row still carries the
-- homepage tile with the karak photograph, and src/lib/content.js resolves that tile, and any
-- /menu#tea link saved before today, to hot drinks. Deleting the row would take the tile with it,
-- which is worth knowing before the dashboard offers to delete it: an empty category is exactly
-- what its "delete" button is for.
--
-- Safe to re-run: the second run finds nothing to move and renumbers nothing.

begin;

-- Captured before the move, because afterwards nothing distinguishes the products that arrived
-- from the ones that were already there.
create temporary table folding_products on commit drop as
select p.id
  from public.menu_products p
  join public.menu_categories c on c.id = p.category_id
 where c.slug = 'tea';

update public.menu_products p
   set category_id = (select id from public.menu_categories where slug = 'hot-drinks')
 where p.id in (select id from folding_products);

-- Tea first in the order it had, then the hot drinks in the order they had. Numbered in tens the
-- way 0007 left every other list, so a row can still be dragged between two neighbours.
with ordered as (
  select
    p.id,
    (row_number() over (
      order by (f.id is not null) desc, p.sort_order, p.created_at, p.slug
    ) * 10)::integer as target
  from public.menu_products p
  join public.menu_categories c on c.id = p.category_id
  left join folding_products f on f.id = p.id
  where c.slug = 'hot-drinks'
)
update public.menu_products p
   set sort_order = ordered.target
  from ordered
 where ordered.id = p.id
   and p.sort_order is distinct from ordered.target;

commit;

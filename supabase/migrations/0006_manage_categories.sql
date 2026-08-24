-- Niola Lounge — category management
--
-- 0004 let administrators write menu_products but kept menu_categories read-only, on the
-- assumption that categories change once a year and could be edited from the Supabase dashboard.
-- They do change, and whoever runs the menu should not need a database login to rename a section
-- or add one. This opens the same door for categories that products already have.
--
-- Deletion stays deliberately hard: menu_products.category_id is ON DELETE RESTRICT, so removing
-- a category that still holds products fails rather than taking them with it. That is the
-- behaviour we want — the dashboard offers "hide" for the common case and only allows a delete
-- once the category is empty.

begin;

-- Supersedes the select-only policy from 0004: a `for all` policy already covers reading, and
-- keeping both would mean two rules saying the same thing about the same rows.
drop policy if exists "admins read every category" on public.menu_categories;

drop policy if exists "admins manage categories" on public.menu_categories;
create policy "admins manage categories"
  on public.menu_categories
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- As with menu_products, the grant only makes the commands reachable; RLS still decides row by
-- row, so an authenticated non-administrator matches nothing and writes nothing.
grant insert, update, delete on public.menu_categories to authenticated;

commit;

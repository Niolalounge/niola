-- Niola Lounge — menu dashboard
--
-- Opens writing on menu_products to signed-in administrators only. Visitors keep the read-only
-- access they have today: the anon key still cannot write, and nothing here grants it anything.
--
-- Membership is a row in admin_users, not a claim inside the JWT, so revoking someone is a
-- DELETE that takes effect on their next request rather than whenever their token expires.

begin;

-- ---------------------------------------------------------------------------
-- Who is an administrator
-- ---------------------------------------------------------------------------

create table if not exists public.admin_users (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  created_at  timestamptz not null default now()
);

comment on table public.admin_users is
  'Everyone allowed to edit the menu. Add a row for an existing auth user to grant access; '
  'delete the row to revoke it. Editable from the Supabase dashboard only.';

alter table public.admin_users enable row level security;

-- An administrator may confirm their own membership; nobody can read the full list, and no
-- policy grants writes, so the table is only editable with the service role.
drop policy if exists "admins see their own membership" on public.admin_users;
create policy "admins see their own membership"
  on public.admin_users
  for select
  to authenticated
  using (user_id = (select auth.uid()));

/**
 * SECURITY DEFINER so the check can read admin_users regardless of who is asking — the policies
 * below call it, and a caller who cannot read the table would otherwise always evaluate false.
 * It answers only about the caller's own id, so it cannot be used to enumerate administrators.
 */
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

comment on function public.is_admin() is
  'True when the current request is authenticated as an administrator.';

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- What administrators may do
--
-- Policies are OR'd, so these sit alongside the public "published rows only" policies rather
-- than replacing them: an administrator additionally sees unpublished rows, which is the whole
-- point of a dashboard that can un-hide a product.
-- ---------------------------------------------------------------------------

drop policy if exists "admins read every category" on public.menu_categories;
create policy "admins read every category"
  on public.menu_categories
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admins manage products" on public.menu_products;
create policy "admins manage products"
  on public.menu_products
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- RLS decides row by row; these grants only make the commands reachable at all. An authenticated
-- non-administrator still matches no rows and writes nothing.
grant insert, update, delete on public.menu_products to authenticated;

-- ---------------------------------------------------------------------------
-- A new product starts hidden
--
-- 0001 defaulted is_published to true, which combined with the "published rows need an image"
-- constraint made a plain INSERT fail before the photograph exists. Starting hidden lets the
-- dashboard create the row first, attach the image, then publish deliberately — and means a
-- half-entered product can never appear on the live site.
-- ---------------------------------------------------------------------------

alter table public.menu_products alter column is_published set default false;

-- ---------------------------------------------------------------------------
-- Product photography
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-images',
  'menu-images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- The bucket is public so <img src> works without a signed URL, exactly like the files already
-- served from public/images.
drop policy if exists "menu images are publicly readable" on storage.objects;
create policy "menu images are publicly readable"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'menu-images');

drop policy if exists "admins upload menu images" on storage.objects;
create policy "admins upload menu images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'menu-images' and public.is_admin());

drop policy if exists "admins replace menu images" on storage.objects;
create policy "admins replace menu images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'menu-images' and public.is_admin())
  with check (bucket_id = 'menu-images' and public.is_admin());

drop policy if exists "admins delete menu images" on storage.objects;
create policy "admins delete menu images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'menu-images' and public.is_admin());

commit;

-- Niola Lounge — live updates
--
-- Goal: a price change, a new product or a hidden one reaches open browsers without anyone
-- pressing reload.
--
-- The obvious approach — subscribe the site to menu_products — has a hole. Realtime applies Row
-- Level Security to each subscriber, and an anonymous visitor may only see published rows. So
-- hiding a product produces an UPDATE whose new row that visitor is not allowed to see, no event
-- is delivered, and the product stays on their screen: the one change most worth pushing is the
-- one that silently fails.
--
-- Instead every write bumps a single counter row that anonymous visitors can always read. The
-- event therefore always arrives, and the client refetches the menu through its normal query,
-- where RLS decides what it gets. One extra row, one event per change, no holes.

begin;

create table if not exists public.content_revision (
  id          smallint primary key default 1 check (id = 1),
  revision    bigint not null default 1,
  updated_at  timestamptz not null default now()
);

comment on table public.content_revision is
  'A single row whose counter increments on every menu or gallery write. Open browsers watch it '
  'over Realtime and refetch when it moves. Never edit it by hand.';

insert into public.content_revision (id) values (1) on conflict (id) do nothing;

alter table public.content_revision enable row level security;

-- Readable by everyone: that is the whole point — the notification must reach visitors who are
-- not allowed to see the row that actually changed.
drop policy if exists "revision is public" on public.content_revision;
create policy "revision is public"
  on public.content_revision
  for select
  to anon, authenticated
  using (true);

revoke all on public.content_revision from anon, authenticated;
grant select on public.content_revision to anon, authenticated;
grant all on public.content_revision to service_role;

/**
 * SECURITY DEFINER so the counter moves for whoever wrote — an administrator has no write policy
 * on this table, and should not need one.
 */
create or replace function public.bump_content_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.content_revision
     set revision = revision + 1, updated_at = now()
   where id = 1;
  return null;
end;
$$;

comment on function public.bump_content_revision() is
  'AFTER-trigger helper: advances content_revision so subscribed browsers refetch.';

-- Statement-level: one bump per statement rather than per row, so a bulk update sends one event.
drop trigger if exists menu_products_bump_revision on public.menu_products;
create trigger menu_products_bump_revision
  after insert or update or delete on public.menu_products
  for each statement execute function public.bump_content_revision();

drop trigger if exists menu_categories_bump_revision on public.menu_categories;
create trigger menu_categories_bump_revision
  after insert or update or delete on public.menu_categories
  for each statement execute function public.bump_content_revision();

drop trigger if exists gallery_items_bump_revision on public.gallery_items;
create trigger gallery_items_bump_revision
  after insert or update or delete on public.gallery_items
  for each statement execute function public.bump_content_revision();

-- ---------------------------------------------------------------------------
-- Publish it to Realtime
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'content_revision'
  ) then
    alter publication supabase_realtime add table public.content_revision;
  end if;
end;
$$;

commit;

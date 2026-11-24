create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  resource_type text not null check (
    resource_type in ('deck', 'module', 'course', 'practice_quiz', 'print_exam')
  ),
  resource_id text not null,
  title text not null check (length(title) between 1 and 200),
  visibility text not null default 'anyone' check (visibility in ('anyone', 'restricted')),
  allowed_emails text[] not null default '{}',
  share_token text not null unique check (share_token ~ '^[A-Za-z0-9_-]{43}$'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, resource_type, resource_id),
  check (cardinality(allowed_emails) <= 50),
  check (visibility = 'anyone' or cardinality(allowed_emails) > 0)
);

alter table public.share_links enable row level security;
revoke all on public.share_links from public, anon, authenticated;
grant select, insert, update, delete on public.share_links to authenticated;

create policy "Owners can read their share links"
  on public.share_links
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Owners can create their share links"
  on public.share_links
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Owners can update their share links"
  on public.share_links
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Owners can delete their share links"
  on public.share_links
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

create or replace function public.read_shared_resource(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'title', share.title,
    'resourceType', share.resource_type,
    'payload', share.payload
  )
  from public.share_links as share
  where share.share_token = p_token
    and (
      share.visibility = 'anyone'
      or share.owner_id = (select auth.uid())
      or (
        (select auth.uid()) is not null
        and exists (
          select 1
          from auth.users as invited_user
          where invited_user.id = (select auth.uid())
            and invited_user.email_confirmed_at is not null
            and exists (
              select 1
              from pg_catalog.unnest(share.allowed_emails) as invited_email(email)
              where pg_catalog.lower(invited_email.email) = pg_catalog.lower(invited_user.email)
            )
        )
      )
    )
  limit 1;
$$;

revoke all on function public.read_shared_resource(text) from public;
grant execute on function public.read_shared_resource(text) to anon, authenticated;

alter table public.share_links
  add column custom_slug text,
  add constraint share_links_custom_slug_format
    check (
      custom_slug is null
      or custom_slug ~ '^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$'
    );

create unique index share_links_custom_slug_key
  on public.share_links (custom_slug)
  where custom_slug is not null;

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
  where (share.share_token = p_token or share.custom_slug = p_token)
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

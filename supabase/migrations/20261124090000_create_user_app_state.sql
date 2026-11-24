create table if not exists public.user_app_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.user_app_state enable row level security;
revoke all on public.user_app_state from anon, authenticated;

create policy "Users can read their own app state"
  on public.user_app_state
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own app state"
  on public.user_app_state
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own app state"
  on public.user_app_state
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.user_app_state to authenticated;

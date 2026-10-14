-- SnapClean database schema for Supabase (Postgres).
-- Run this in the Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- users (public profile mirror of auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  daily_count integer not null default 0,
  last_reset date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- images (lightweight history of processed images; previews only)
-- ---------------------------------------------------------------------------
create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  original_url text not null default '',
  processed_url text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists images_user_created_idx
  on public.images (user_id, created_at desc);
create index if not exists images_created_idx
  on public.images (created_at desc);

-- ---------------------------------------------------------------------------
-- subscriptions (Stripe subscription state)
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  stripe_customer_id text,
  status text not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  constraint subscriptions_user_id_key unique (user_id)
);

-- ---------------------------------------------------------------------------
-- waitlist (Pro plan interest — payments are postponed)
-- ---------------------------------------------------------------------------
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text,
  created_at timestamptz not null default now(),
  constraint waitlist_email_key unique (email)
);

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, plan)
  values (new.id, new.email, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.images enable row level security;
alter table public.subscriptions enable row level security;
alter table public.waitlist enable row level security;

-- users: a user can read and update only their own row.
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- images: a user can read and insert only their own images.
drop policy if exists "images_select_own" on public.images;
create policy "images_select_own" on public.images
  for select using (auth.uid() = user_id);

drop policy if exists "images_insert_own" on public.images;
create policy "images_insert_own" on public.images
  for insert with check (auth.uid() = user_id);

-- subscriptions: read-only for owners; writes happen via the service role.
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

-- waitlist: anyone may join, but collected emails are private (no read policy).
drop policy if exists "waitlist_insert_public" on public.waitlist;
create policy "waitlist_insert_public" on public.waitlist
  for insert to anon, authenticated with check (true);

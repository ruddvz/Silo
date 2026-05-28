-- Silo Lists schema (Supabase)
-- Run via Supabase SQL editor or CLI after creating a project.

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_upsert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Shared spaces (two-person list rooms)
create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table public.spaces enable row level security;

create table if not exists public.space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz default now(),
  unique (space_id, user_id)
);

alter table public.space_members enable row level security;

create policy "spaces_member_select" on public.spaces for select using (
  exists (select 1 from public.space_members m where m.space_id = spaces.id and m.user_id = auth.uid())
);

create policy "spaces_insert_auth" on public.spaces for insert with check (auth.uid() = created_by);

create policy "members_select" on public.space_members for select using (
  exists (select 1 from public.space_members m where m.space_id = space_members.space_id and m.user_id = auth.uid())
);

create policy "members_insert_self" on public.space_members for insert with check (auth.uid() = user_id);

-- Files (shared-list is type shared-list)
create table if not exists public.files (
  id text primary key,
  space_id uuid not null references public.spaces(id) on delete cascade,
  type text not null default 'shared-list',
  title text not null,
  raw_text text default '',
  notes text default '',
  color text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.files enable row level security;

create policy "files_space_member" on public.files for all using (
  exists (select 1 from public.space_members m where m.space_id = files.space_id and m.user_id = auth.uid())
);

create table if not exists public.list_items (
  id text primary key,
  file_id text not null references public.files(id) on delete cascade,
  text text not null,
  checked boolean default false,
  important boolean default false,
  sort_order int default 0,
  created_by uuid references auth.users(id),
  completed_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz,
  completed_at timestamptz
);

alter table public.list_items enable row level security;

create policy "items_via_file" on public.list_items for all using (
  exists (
    select 1 from public.files f
    join public.space_members m on m.space_id = f.space_id
    where f.id = list_items.file_id and m.user_id = auth.uid()
  )
);

create table if not exists public.activity (
  id text primary key,
  space_id uuid not null references public.spaces(id) on delete cascade,
  file_id text references public.files(id) on delete set null,
  actor_id uuid references auth.users(id),
  action text not null,
  item_text text,
  created_at timestamptz default now()
);

alter table public.activity enable row level security;

create policy "activity_space_member" on public.activity for select using (
  exists (select 1 from public.space_members m where m.space_id = activity.space_id and m.user_id = auth.uid())
);

create policy "activity_insert_member" on public.activity for insert with check (
  exists (select 1 from public.space_members m where m.space_id = activity.space_id and m.user_id = auth.uid())
);

-- Realtime
alter publication supabase_realtime add table public.files;
alter publication supabase_realtime add table public.list_items;
alter publication supabase_realtime add table public.activity;

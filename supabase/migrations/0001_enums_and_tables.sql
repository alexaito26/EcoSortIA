-- =====================================================================
-- EcoSort AI - 0001 - Enums, schema privado, tablas e indices
-- Migracion estructural obligatoria (NO contiene datos demo).
-- =====================================================================

create schema if not exists private;

-- ------------------------------ Enums -------------------------------
do $$ begin
  create type public.user_role as enum ('admin','operator','viewer','user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.device_status as enum ('online','offline','maintenance','error');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.waste_category as enum ('plastic','glass','reject','unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.container_level as enum ('empty','normal','warning','full');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_type as enum ('classification','routing','heartbeat','container_warning','container_full','sensor_error','servo_error','maintenance_required');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.log_level as enum ('debug','info','warning','error','critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.log_source as enum ('wifi','uart','servo','sensor','network','system');
exception when duplicate_object then null; end $$;

-- ------------------------------ Tablas ------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role public.user_role not null default 'user',
  eco_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text,
  location text,
  status public.device_status not null default 'offline',
  firmware_version text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- El token del dispositivo vive en un schema privado NO expuesto por la API.
create table if not exists private.device_secrets (
  device_id uuid primary key references public.devices(id) on delete cascade,
  token_hash text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.containers (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  category public.waste_category not null,
  level public.container_level not null default 'empty',
  fill_percent integer not null default 0 check (fill_percent between 0 and 100),
  updated_at timestamptz not null default now(),
  unique (device_id, category)
);

create table if not exists public.classifications (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  category public.waste_category not null,
  confidence numeric(4,3) check (confidence >= 0 and confidence <= 1),
  eco_points_awarded integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.routing_events (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  classification_id uuid references public.classifications(id) on delete set null,
  category public.waste_category not null,
  success boolean not null default true,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.device_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique, -- idempotencia
  device_id uuid not null references public.devices(id) on delete cascade,
  type public.event_type not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references public.devices(id) on delete cascade,
  level public.log_level not null default 'info',
  source public.log_source not null default 'system',
  message text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.eco_points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  points integer not null,
  reason text,
  classification_id uuid references public.classifications(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ------------------------------ Indices -----------------------------
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_devices_status on public.devices(status);
create index if not exists idx_classifications_user_created on public.classifications(user_id, created_at);
create index if not exists idx_classifications_device_created on public.classifications(device_id, created_at);
create index if not exists idx_device_events_device_occurred on public.device_events(device_id, occurred_at);
create index if not exists idx_system_logs_created on public.system_logs(created_at);
create index if not exists idx_system_logs_level on public.system_logs(level);
create index if not exists idx_containers_device on public.containers(device_id);
create index if not exists idx_ledger_user_created on public.eco_points_ledger(user_id, created_at);

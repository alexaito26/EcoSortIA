-- Compatible tanto con instalaciones históricas como con el esquema remoto.
create extension if not exists pgcrypto with schema extensions;
drop trigger if exists trg_award_eco_points on public.classifications;
alter table public.classifications add column if not exists event_id text;
create unique index if not exists uq_classifications_event_id on public.classifications(event_id) where event_id is not null;

create table if not exists public.screen_events (
  id uuid primary key default gen_random_uuid(), device_id uuid not null references public.devices(id) on delete cascade,
  state text not null default 'waiting' check (state in ('waiting','processing','accepted','rejected')), waste_type text,
  accepted boolean, points integer not null default 0 check (points >= 0), qr_content text, rejection_reason text,
  screen_status text not null default 'pending' check (screen_status in ('pending','displayed','completed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.historial_escaneos (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), image_url text not null, clasificacion text not null
);

alter table public.screen_events add column if not exists claim_token_hash text;
alter table public.screen_events add column if not exists claim_status text not null default 'unclaimed';
alter table public.screen_events add column if not exists claimed_by_user_id uuid references public.profiles(id) on delete set null;
alter table public.screen_events add column if not exists claimed_at timestamptz;
alter table public.screen_events add column if not exists expires_at timestamptz;
alter table public.screen_events add column if not exists classification_id uuid references public.classifications(id) on delete set null;
update public.screen_events set accepted = false where accepted is null;
update public.screen_events set waste_type = 'unknown' where waste_type is null;
alter table public.screen_events alter column accepted set not null;
alter table public.screen_events alter column waste_type set not null;
do $$ begin alter table public.screen_events add constraint screen_events_claim_status_check check (claim_status in ('unclaimed','claimed','skipped','expired')); exception when duplicate_object then null; end $$;
do $$ begin alter table public.screen_events add constraint screen_events_claimed_user_check check (claim_status <> 'claimed' or claimed_by_user_id is not null); exception when duplicate_object then null; end $$;
do $$ begin alter table public.screen_events add constraint screen_events_rejected_points_check check (accepted or points = 0); exception when duplicate_object then null; end $$;
do $$ begin alter table public.screen_events add constraint screen_events_rejected_qr_check check (accepted or qr_content is null); exception when duplicate_object then null; end $$;
do $$ begin alter table public.screen_events add constraint screen_events_accepted_qr_check check (not accepted or points = 0 or qr_content is not null); exception when duplicate_object then null; end $$;
create unique index if not exists uq_screen_events_claim_token_hash on public.screen_events(claim_token_hash) where claim_token_hash is not null;
create unique index if not exists uq_screen_events_classification_id on public.screen_events(classification_id) where classification_id is not null;
create index if not exists idx_screen_events_claim_status on public.screen_events(claim_status);
create index if not exists idx_screen_events_screen_status on public.screen_events(screen_status);
create index if not exists idx_screen_events_created_at on public.screen_events(created_at desc);
create index if not exists idx_screen_events_claimed_by_user_id on public.screen_events(claimed_by_user_id);
create index if not exists idx_screen_events_classification_id on public.screen_events(classification_id);
drop trigger if exists trg_screen_events_updated on public.screen_events;
create trigger trg_screen_events_updated before update on public.screen_events for each row execute function public.set_updated_at();
alter table public.screen_events enable row level security;

alter table public.historial_escaneos add column if not exists event_id text;
alter table public.historial_escaneos add column if not exists device_id uuid references public.devices(id) on delete set null;
alter table public.historial_escaneos add column if not exists user_id uuid references public.profiles(id) on delete set null;
alter table public.historial_escaneos add column if not exists confidence numeric(4,3) check (confidence >= 0 and confidence <= 1);
alter table public.historial_escaneos add column if not exists accepted boolean;
alter table public.historial_escaneos add column if not exists reason text;
create unique index if not exists uq_historial_escaneos_event_id on public.historial_escaneos(event_id) where event_id is not null;
create index if not exists idx_historial_escaneos_device_created on public.historial_escaneos(device_id, created_at desc);
create index if not exists idx_historial_escaneos_user_created on public.historial_escaneos(user_id, created_at desc);
alter table public.historial_escaneos enable row level security;
drop policy if exists historial_escaneos_select_own on public.historial_escaneos;
create policy historial_escaneos_select_own on public.historial_escaneos for select to authenticated using (user_id = auth.uid());
drop policy if exists historial_escaneos_select_staff on public.historial_escaneos;
create policy historial_escaneos_select_staff on public.historial_escaneos for select to authenticated using (private.user_role(auth.uid()) in ('admin','operator','viewer'));

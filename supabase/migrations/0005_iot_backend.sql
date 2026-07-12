-- =====================================================================
-- EcoSort AI - 0005 - Backend IoT (esquema)
-- ---------------------------------------------------------------------
-- Cambios aditivos para la ingestion de eventos del dispositivo:
--  - devices: is_active (habilitacion) y model_version (version del modelo IA)
--  - sensor_readings: historico de niveles de contenedores
--  - device_events: event_id y type a TEXT (IDs tipo "evt-..." y tipos de la
--    API del dispositivo). Sigue siendo el ancla de idempotencia (event_id UNIQUE).
-- No renombra tablas ni rompe el dashboard existente.
-- =====================================================================

-- --------------------------- devices --------------------------------
alter table public.devices add column if not exists is_active boolean not null default true;
alter table public.devices add column if not exists model_version text;

-- ------------------------ sensor_readings ---------------------------
create table if not exists public.sensor_readings (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  category public.waste_category not null,
  fill_percent integer not null check (fill_percent between 0 and 100),
  event_id text,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_sensor_readings_device_recorded
  on public.sensor_readings(device_id, recorded_at);

-- ------------------------- device_events ----------------------------
-- event_id: uuid -> text (acepta IDs del dispositivo tipo "evt-20260711-00001").
-- type: enum -> text (tipos de la API: classification_completed, etc.).
-- La restriccion UNIQUE(event_id) se conserva para idempotencia.
alter table public.device_events alter column event_id set data type text using event_id::text;
alter table public.device_events alter column "type" set data type text using "type"::text;

-- --------------------------- RLS ------------------------------------
alter table public.sensor_readings enable row level security;

drop policy if exists sensor_readings_select_staff on public.sensor_readings;
create policy sensor_readings_select_staff on public.sensor_readings
  for select to authenticated
  using (private.user_role(auth.uid()) in ('admin','operator','viewer'));
-- Sin politicas de escritura para clientes: solo Edge Functions (service_role).

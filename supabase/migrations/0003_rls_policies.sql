-- =====================================================================
-- EcoSort AI - 0003 - Row Level Security y politicas por rol
-- Roles: admin (todo), operator (operativo, sin roles), viewer (lectura),
-- user (solo lo propio). anon: sin acceso a tablas operativas.
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.containers enable row level security;
alter table public.classifications enable row level security;
alter table public.routing_events enable row level security;
alter table public.device_events enable row level security;
alter table public.system_logs enable row level security;
alter table public.eco_points_ledger enable row level security;
alter table private.device_secrets enable row level security; -- deny-all: solo service_role

-- ------------------------------ PROFILES ----------------------------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles for select to authenticated using (private.user_role(auth.uid()) = 'admin');
-- El usuario puede editar su perfil pero el cambio de role lo bloquea prevent_role_change().
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles for update to authenticated
  using (private.user_role(auth.uid()) = 'admin')
  with check (private.user_role(auth.uid()) = 'admin');

-- ------------------------------ DEVICES -----------------------------
drop policy if exists devices_select_staff on public.devices;
create policy devices_select_staff on public.devices for select to authenticated using (private.user_role(auth.uid()) in ('admin','operator','viewer'));
drop policy if exists devices_insert_ops on public.devices;
create policy devices_insert_ops on public.devices for insert to authenticated with check (private.user_role(auth.uid()) in ('admin','operator'));
drop policy if exists devices_update_ops on public.devices;
create policy devices_update_ops on public.devices for update to authenticated using (private.user_role(auth.uid()) in ('admin','operator')) with check (private.user_role(auth.uid()) in ('admin','operator'));
drop policy if exists devices_delete_admin on public.devices;
create policy devices_delete_admin on public.devices for delete to authenticated using (private.user_role(auth.uid()) = 'admin');

-- ----------------------------- CONTAINERS ---------------------------
drop policy if exists containers_select_staff on public.containers;
create policy containers_select_staff on public.containers for select to authenticated using (private.user_role(auth.uid()) in ('admin','operator','viewer'));
drop policy if exists containers_insert_ops on public.containers;
create policy containers_insert_ops on public.containers for insert to authenticated with check (private.user_role(auth.uid()) in ('admin','operator'));
drop policy if exists containers_update_ops on public.containers;
create policy containers_update_ops on public.containers for update to authenticated using (private.user_role(auth.uid()) in ('admin','operator')) with check (private.user_role(auth.uid()) in ('admin','operator'));
drop policy if exists containers_delete_admin on public.containers;
create policy containers_delete_admin on public.containers for delete to authenticated using (private.user_role(auth.uid()) = 'admin');

-- --------------------------- CLASSIFICATIONS ------------------------
-- Escritura solo via Edge Functions (service_role, omite RLS) en Fase 4.
drop policy if exists classifications_select_staff on public.classifications;
create policy classifications_select_staff on public.classifications for select to authenticated using (private.user_role(auth.uid()) in ('admin','operator','viewer'));
drop policy if exists classifications_select_own on public.classifications;
create policy classifications_select_own on public.classifications for select to authenticated using (user_id = auth.uid());

-- --------------------------- ROUTING EVENTS -------------------------
drop policy if exists routing_select_staff on public.routing_events;
create policy routing_select_staff on public.routing_events for select to authenticated using (private.user_role(auth.uid()) in ('admin','operator','viewer'));

-- --------------------------- DEVICE EVENTS --------------------------
drop policy if exists device_events_select_admin on public.device_events;
create policy device_events_select_admin on public.device_events for select to authenticated using (private.user_role(auth.uid()) = 'admin');

-- ----------------------------- SYSTEM LOGS --------------------------
drop policy if exists system_logs_select_admin on public.system_logs;
create policy system_logs_select_admin on public.system_logs for select to authenticated using (private.user_role(auth.uid()) = 'admin');

-- -------------------------- ECO POINTS LEDGER -----------------------
drop policy if exists ledger_select_own on public.eco_points_ledger;
create policy ledger_select_own on public.eco_points_ledger for select to authenticated using (user_id = auth.uid());
drop policy if exists ledger_select_admin on public.eco_points_ledger;
create policy ledger_select_admin on public.eco_points_ledger for select to authenticated using (private.user_role(auth.uid()) = 'admin');

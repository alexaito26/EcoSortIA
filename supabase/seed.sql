-- =====================================================================
-- EcoSort AI - Bootstrap minimo (SOLO DESARROLLO LOCAL)
-- ---------------------------------------------------------------------
-- NO inserta historial inventado. Solo deja cuentas de acceso + dispositivo
-- con contenedores vacios para poder desarrollar sin datos fake.
--
-- En el proyecto remoto de produccion/demo "solo datos reales", el historial
-- debe venir del simulador o del firmware (event_id evt-...), nunca de aqui.
--
-- Ejecutar: ver docs/supabase.md ("Como ejecutar el seed").
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ------------------- Usuario demo (rol user) ------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin,
  confirmation_token, recovery_token, email_change,
  email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'user@ejemplo.com',
  extensions.crypt('EcoSortDev123!', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Usuario Demo"}'::jsonb,
  false,
  '', '', '', '', '', '', '', ''
) on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values (
  extensions.gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  'user@ejemplo.com',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"user@ejemplo.com","email_verified":true}'::jsonb,
  'email', now(), now(), now()
) on conflict do nothing;

-- ------------------- Usuario admin ----------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin,
  confirmation_token, recovery_token, email_change,
  email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'authenticated', 'authenticated', 'admin@ejemplo.com',
  extensions.crypt('EcoSortAdmin123!', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Administrador Demo"}'::jsonb,
  false,
  '', '', '', '', '', '', '', ''
) on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values (
  extensions.gen_random_uuid(),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'admin@ejemplo.com',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","email":"admin@ejemplo.com","email_verified":true}'::jsonb,
  'email', now(), now(), now()
) on conflict do nothing;

update public.profiles
  set role = 'admin', full_name = 'Administrador Demo', eco_points = 0
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

update public.profiles
  set eco_points = 0
  where id = '11111111-1111-1111-1111-111111111111';

-- --------------------------- Dispositivo ----------------------------
insert into public.devices (id, code, name, location, status, firmware_version, last_seen_at)
values (
  '22222222-2222-2222-2222-222222222222',
  'ECOSORT-01', 'EcoSort Prototipo 01', 'Laboratorio - Bloque A',
  'offline', '0.1.0-dev', null
)
on conflict (id) do update set
  code = excluded.code, name = excluded.name, location = excluded.location,
  status = excluded.status, firmware_version = excluded.firmware_version,
  last_seen_at = excluded.last_seen_at;

-- Contenedores vacios (sin niveles inventados).
insert into public.containers (id, device_id, category, level, fill_percent) values
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222222', 'plastic', 'empty', 0),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222222', 'glass',   'empty', 0),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222222', 'reject',  'empty', 0)
on conflict (id) do update set
  level = excluded.level, fill_percent = excluded.fill_percent;

-- Sin clasificaciones, ruteos, logs ni device_events de demo.
-- El historial debe generarse con el simulador o el firmware.

-- =====================================================================
-- EcoSort AI - Seed de datos DEMO (SOLO DESARROLLO)
-- ---------------------------------------------------------------------
-- NO ejecutar en produccion. Datos deterministas e idempotentes:
-- usan identificadores fijos y UPSERT para poder re-ejecutarse sin
-- duplicar informacion. No contiene contrasenas, tokens ni correos
-- personales reales (se usan direcciones de ejemplo).
--
-- Ejecutar: ver docs/supabase.md ("Como ejecutar el seed").
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ------------------- Usuario demo (dev-only, rol user) --------------
-- El trigger handle_new_user crea automaticamente su public.profiles.
-- Nota: las columnas de token (confirmation_token, recovery_token,
-- email_change*) DEBEN ir como cadena vacia; si quedan NULL, el servicio de
-- Auth (GoTrue) no puede leer el registro y el login falla.
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

-- ------------------- Usuario admin (dev-only, rol admin) ------------
-- El trigger handle_new_user crea el perfil con rol 'user'; luego se
-- eleva a 'admin' via UPDATE (permitido en contexto de servidor porque
-- auth.uid() es null; ver prevent_role_change en 0002).
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
  set role = 'admin', full_name = 'Administrador Demo'
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- --------------------------- Dispositivo ----------------------------
insert into public.devices (id, code, name, location, status, firmware_version, last_seen_at)
values (
  '22222222-2222-2222-2222-222222222222',
  'ECOSORT-01', 'EcoSort Prototipo 01', 'Laboratorio - Bloque A',
  'online', '0.1.0-dev', now()
)
on conflict (id) do update set
  code = excluded.code, name = excluded.name, location = excluded.location,
  status = excluded.status, firmware_version = excluded.firmware_version,
  last_seen_at = excluded.last_seen_at;

-- Nota: el token del dispositivo (private.device_secrets) se configura
-- por separado y nunca se versiona en Git.

-- --------------------------- Contenedores ---------------------------
insert into public.containers (id, device_id, category, level, fill_percent) values
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222222', 'plastic', 'warning', 78),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222222', 'glass',   'normal',  45),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222222', 'reject',  'full',    96)
on conflict (id) do update set
  level = excluded.level, fill_percent = excluded.fill_percent;

-- -------------------------- Clasificaciones -------------------------
-- Repartidas en varios dias y horas (para graficos por hora/dia).
-- Algunas atribuidas al usuario demo (otorgan EcoPuntos via trigger).
insert into public.classifications (id, device_id, user_id, category, confidence, eco_points_awarded, created_at) values
  ('44444444-4444-4444-4444-444444444401', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'plastic', 0.965, 10, '2026-07-06T08:15:00Z'),
  ('44444444-4444-4444-4444-444444444402', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'glass',   0.921,  8, '2026-07-06T11:42:00Z'),
  ('44444444-4444-4444-4444-444444444403', '22222222-2222-2222-2222-222222222222', null,                                     'reject',  0.804,  0, '2026-07-06T15:05:00Z'),
  ('44444444-4444-4444-4444-444444444404', '22222222-2222-2222-2222-222222222222', null,                                     'unknown', 0.412,  0, '2026-07-07T09:20:00Z'),
  ('44444444-4444-4444-4444-444444444405', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'plastic', 0.988, 10, '2026-07-07T13:10:00Z'),
  ('44444444-4444-4444-4444-444444444406', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'glass',   0.877,  8, '2026-07-07T18:33:00Z'),
  ('44444444-4444-4444-4444-444444444407', '22222222-2222-2222-2222-222222222222', null,                                     'plastic', 0.933,  0, '2026-07-08T07:55:00Z'),
  ('44444444-4444-4444-4444-444444444408', '22222222-2222-2222-2222-222222222222', null,                                     'unknown', 0.388,  0, '2026-07-08T12:48:00Z'),
  ('44444444-4444-4444-4444-444444444409', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'glass',   0.902,  8, '2026-07-09T10:05:00Z'),
  ('44444444-4444-4444-4444-44444444440a', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'plastic', 0.956, 10, '2026-07-09T16:27:00Z'),
  ('44444444-4444-4444-4444-44444444440b', '22222222-2222-2222-2222-222222222222', null,                                     'reject',  0.712,  0, '2026-07-10T09:14:00Z'),
  ('44444444-4444-4444-4444-44444444440c', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'plastic', 0.971, 10, '2026-07-10T14:39:00Z')
on conflict (id) do nothing;

-- --------------------------- Ruteos ---------------------------------
-- Exitosos y algunos errores mecanicos controlados.
insert into public.routing_events (id, device_id, classification_id, category, success, error_message, created_at) values
  ('55555555-5555-5555-5555-555555555501', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444401', 'plastic', true,  null, '2026-07-06T08:15:03Z'),
  ('55555555-5555-5555-5555-555555555502', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444402', 'glass',   true,  null, '2026-07-06T11:42:04Z'),
  ('55555555-5555-5555-5555-555555555503', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444403', 'reject',  true,  null, '2026-07-06T15:05:02Z'),
  ('55555555-5555-5555-5555-555555555504', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444405', 'plastic', false, 'Fallo de servo: no alcanzo la posicion objetivo', '2026-07-07T13:10:05Z'),
  ('55555555-5555-5555-5555-555555555505', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444409', 'glass',   true,  null, '2026-07-09T10:05:03Z'),
  ('55555555-5555-5555-5555-555555555506', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-44444444440b', 'reject',  false, 'Atasco mecanico detectado en la compuerta', '2026-07-10T09:14:06Z')
on conflict (id) do nothing;

-- --------------------------- Logs del sistema -----------------------
insert into public.system_logs (id, device_id, level, source, message, context, created_at) values
  ('66666666-6666-6666-6666-666666666601', '22222222-2222-2222-2222-222222222222', 'info',    'wifi',   'Conectado a la red WiFi', '{"rssi":-58}'::jsonb, '2026-07-06T08:00:00Z'),
  ('66666666-6666-6666-6666-666666666602', '22222222-2222-2222-2222-222222222222', 'warning', 'uart',   'Checksum UART invalido, reintentando', '{"retries":2}'::jsonb, '2026-07-07T13:09:58Z'),
  ('66666666-6666-6666-6666-666666666603', '22222222-2222-2222-2222-222222222222', 'error',   'servo',  'El servo no alcanzo la posicion objetivo', '{"target_deg":90,"actual_deg":72}'::jsonb, '2026-07-07T13:10:05Z'),
  ('66666666-6666-6666-6666-666666666604', '22222222-2222-2222-2222-222222222222', 'info',    'sensor', 'Lectura de sensor de nivel', '{"container":"plastic","fill":78}'::jsonb, '2026-07-08T07:55:10Z'),
  ('66666666-6666-6666-6666-666666666605', '22222222-2222-2222-2222-222222222222', 'critical','servo',  'Atasco mecanico detectado en la compuerta', '{"container":"reject"}'::jsonb, '2026-07-10T09:14:06Z'),
  ('66666666-6666-6666-6666-666666666606', '22222222-2222-2222-2222-222222222222', 'info',    'network','Latido enviado al servidor', '{"ok":true}'::jsonb, '2026-07-10T14:40:00Z')
on conflict (id) do nothing;

-- --------------------------- Eventos crudos -------------------------
insert into public.device_events (id, event_id, device_id, type, payload, occurred_at) values
  ('77777777-7777-7777-7777-777777777701', '88888888-8888-8888-8888-888888888801', '22222222-2222-2222-2222-222222222222', 'heartbeat', '{"uptime":3600}'::jsonb, '2026-07-10T14:40:00Z'),
  ('77777777-7777-7777-7777-777777777702', '88888888-8888-8888-8888-888888888802', '22222222-2222-2222-2222-222222222222', 'container_warning', '{"container":"plastic","fill":78}'::jsonb, '2026-07-10T09:00:00Z'),
  ('77777777-7777-7777-7777-777777777703', '88888888-8888-8888-8888-888888888803', '22222222-2222-2222-2222-222222222222', 'container_full', '{"container":"reject","fill":96}'::jsonb, '2026-07-10T09:14:06Z')
on conflict (id) do nothing;

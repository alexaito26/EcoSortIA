-- =====================================================================
-- EcoSort AI - 0006 - Backend IoT (funciones)
-- ---------------------------------------------------------------------
-- Toda la logica de escritura del dispositivo vive en RPCs SECURITY DEFINER
-- invocadas por las Edge Functions con service_role. Los clientes del
-- navegador NO pueden ejecutarlas (grants restringidos).
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ------------------- Helper: nivel a partir de % --------------------
create or replace function public.container_level_of(p_fill integer)
returns public.container_level language sql immutable set search_path = ''
as $fn$
  select case
    when p_fill >= 90 then 'full'::public.container_level
    when p_fill >= 70 then 'warning'::public.container_level
    when p_fill > 0 then 'normal'::public.container_level
    else 'empty'::public.container_level
  end
$fn$;

-- ------------------- Estado efectivo (offline) ----------------------
-- Un dispositivo se considera offline si su ultimo latido supera el umbral,
-- salvo estados manuales (maintenance/error), que se respetan.
create or replace function public.device_effective_status(
  p_status public.device_status,
  p_last_seen timestamptz,
  p_threshold interval default interval '90 seconds'
) returns text language sql stable set search_path = ''
as $fn$
  select case
    when p_status in ('maintenance','error') then p_status::text
    when p_last_seen is null then 'offline'
    when now() - p_last_seen > p_threshold then 'offline'
    else 'online'
  end
$fn$;

-- ------------------- Autenticacion del dispositivo ------------------
-- Compara el token recibido contra el hash bcrypt guardado. Nunca expone
-- el hash. Devuelve banderas para distinguir 404 / 401 / 403.
-- Vive en public (SECURITY DEFINER) para poder invocarse via PostgREST RPC
-- con service_role; el acceso queda restringido por grants.
create or replace function public.verify_device(p_code text, p_token text)
returns table(device_id uuid, found boolean, authenticated boolean, active boolean)
language plpgsql stable security definer set search_path = ''
as $fn$
declare
  v_id uuid;
  v_active boolean;
  v_hash text;
begin
  select d.id, d.is_active, s.token_hash
    into v_id, v_active, v_hash
    from public.devices d
    left join private.device_secrets s on s.device_id = d.id
    where d.code = p_code;

  if v_id is null then
    return query select null::uuid, false, false, false;
    return;
  end if;

  if v_hash is null or v_hash <> extensions.crypt(p_token, v_hash) then
    return query select v_id, true, false, coalesce(v_active, false);
    return;
  end if;

  return query select v_id, true, true, coalesce(v_active, true);
end
$fn$;

-- ------------------- Rotacion de token (admin) ----------------------
-- Genera un token aleatorio, guarda SOLO su hash bcrypt y lo devuelve UNA vez.
-- Permitido en contexto de servidor (auth.uid() is null) o para admins.
create or replace function public.rotate_device_token(p_device_id uuid)
returns text language plpgsql security definer set search_path = ''
as $fn$
declare
  v_token text;
begin
  if auth.uid() is not null and private.user_role(auth.uid()) is distinct from 'admin' then
    raise exception 'Solo un administrador puede rotar tokens de dispositivo';
  end if;

  if not exists (select 1 from public.devices where id = p_device_id) then
    raise exception 'Dispositivo inexistente';
  end if;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');

  insert into private.device_secrets (device_id, token_hash)
  values (p_device_id, extensions.crypt(v_token, extensions.gen_salt('bf')))
  on conflict (device_id) do update
    set token_hash = excluded.token_hash, updated_at = now();

  return v_token;
end
$fn$;

-- ------------------- Actualiza contenedores + lecturas --------------
create or replace function private.apply_bin_levels(
  p_device_id uuid,
  p_bin_levels jsonb,
  p_event_id text,
  p_recorded_at timestamptz
) returns void language plpgsql security definer set search_path = ''
as $fn$
declare
  v_cat text;
  v_level integer;
begin
  if p_bin_levels is null then
    return;
  end if;
  foreach v_cat in array array['plastic','glass','reject'] loop
    if p_bin_levels ? v_cat then
      v_level := (p_bin_levels ->> v_cat)::integer;
      if v_level < 0 or v_level > 100 then
        continue;
      end if;
      update public.containers
        set fill_percent = v_level,
            level = public.container_level_of(v_level)
        where device_id = p_device_id and category = v_cat::public.waste_category;

      insert into public.sensor_readings (device_id, category, fill_percent, event_id, recorded_at)
      values (p_device_id, v_cat::public.waste_category, v_level, p_event_id, p_recorded_at);
    end if;
  end loop;
end
$fn$;

-- ------------------- Ingesta atomica de evento ----------------------
-- Datos YA validados por la Edge Function. Idempotente por event_id.
create or replace function public.ingest_device_event(
  p_device_id uuid,
  p_event_id text,
  p_event_type text,
  p_occurred_at timestamptz,
  p_payload jsonb
) returns jsonb language plpgsql security definer set search_path = ''
as $fn$
declare
  v_rows integer;
  v_material public.waste_category;
  v_confidence numeric;
  v_user uuid;
  v_routing_success boolean;
  v_awarded integer;
  v_class_id uuid;
  v_error text;
begin
  -- Ancla de idempotencia: si el event_id ya existe, no se procesa de nuevo.
  insert into public.device_events (event_id, device_id, "type", payload, occurred_at)
  values (p_event_id, p_device_id, p_event_type, coalesce(p_payload, '{}'::jsonb), p_occurred_at)
  on conflict (event_id) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return jsonb_build_object('duplicate', true);
  end if;

  -- Liveness del dispositivo (no degrada un estado manual 'maintenance').
  update public.devices set
    last_seen_at = greatest(coalesce(last_seen_at, p_occurred_at), p_occurred_at),
    status = case when status = 'maintenance' then status else 'online'::public.device_status end,
    firmware_version = coalesce(nullif(p_payload->>'firmware_version',''), firmware_version),
    model_version = coalesce(nullif(p_payload->>'model_version',''), model_version)
  where id = p_device_id;

  v_user := nullif(p_payload->>'user_id','')::uuid;
  v_error := nullif(p_payload->>'message','');

  if p_event_type = 'classification_completed' then
    v_material := (p_payload->>'material')::public.waste_category;
    v_confidence := nullif(p_payload->>'confidence','')::numeric;
    v_routing_success := coalesce((p_payload->>'routing_success')::boolean, true);
    v_awarded := case
      when v_user is not null and v_routing_success
      then coalesce((p_payload->>'eco_points')::integer, 0) else 0 end;

    insert into public.classifications (device_id, user_id, category, confidence, eco_points_awarded)
    values (p_device_id, v_user, v_material, v_confidence, v_awarded)
    returning id into v_class_id;

    insert into public.routing_events (device_id, classification_id, category, success, error_message)
    values (
      p_device_id, v_class_id, v_material, v_routing_success,
      case when v_routing_success then null else coalesce(v_error, 'Fallo de ruteo') end
    );

    if not v_routing_success then
      insert into public.system_logs (device_id, level, source, message, context)
      values (p_device_id, 'error', 'servo', coalesce(v_error, 'Fallo de ruteo'),
              jsonb_build_object('event_id', p_event_id, 'category', v_material));
    end if;

    perform private.apply_bin_levels(p_device_id, p_payload->'bin_levels', p_event_id, p_occurred_at);

  elsif p_event_type = 'classification_rejected' then
    v_material := coalesce((p_payload->>'material')::public.waste_category, 'unknown');
    v_confidence := nullif(p_payload->>'confidence','')::numeric;

    insert into public.classifications (device_id, user_id, category, confidence, eco_points_awarded)
    values (p_device_id, null, v_material, v_confidence, 0);

    perform private.apply_bin_levels(p_device_id, p_payload->'bin_levels', p_event_id, p_occurred_at);

  elsif p_event_type = 'routing_error' then
    v_material := coalesce((p_payload->>'material')::public.waste_category, 'unknown');
    insert into public.routing_events (device_id, classification_id, category, success, error_message)
    values (p_device_id, null, v_material, false, coalesce(v_error, 'Error de ruteo'));

    insert into public.system_logs (device_id, level, source, message, context)
    values (p_device_id, 'error', 'servo', coalesce(v_error, 'Error de ruteo'),
            jsonb_build_object('event_id', p_event_id, 'category', v_material));

  elsif p_event_type = 'sensor_error' then
    insert into public.system_logs (device_id, level, source, message, context)
    values (p_device_id, 'error', 'sensor', coalesce(v_error, 'Error de sensor'),
            jsonb_build_object('event_id', p_event_id));
    perform private.apply_bin_levels(p_device_id, p_payload->'bin_levels', p_event_id, p_occurred_at);

  elsif p_event_type = 'system_error' then
    insert into public.system_logs (device_id, level, source, message, context)
    values (p_device_id, 'critical', 'system', coalesce(v_error, 'Error del sistema'),
            jsonb_build_object('event_id', p_event_id));
  end if;

  return jsonb_build_object('duplicate', false);
end
$fn$;

-- ------------------- Heartbeat --------------------------------------
create or replace function public.record_heartbeat(
  p_device_id uuid,
  p_payload jsonb
) returns void language plpgsql security definer set search_path = ''
as $fn$
declare
  v_rssi integer;
  v_state text;
begin
  update public.devices set
    last_seen_at = now(),
    status = case when status = 'maintenance' then status else 'online'::public.device_status end,
    firmware_version = coalesce(nullif(p_payload->>'firmware_version',''), firmware_version),
    model_version = coalesce(nullif(p_payload->>'model_version',''), model_version)
  where id = p_device_id;

  perform private.apply_bin_levels(p_device_id, p_payload->'bin_levels', null, now());

  -- Log SOLO ante anomalias, no en cada latido normal.
  v_rssi := nullif(p_payload->>'wifi_rssi','')::integer;
  v_state := nullif(p_payload->>'state','');

  if v_rssi is not null and v_rssi < -85 then
    insert into public.system_logs (device_id, level, source, message, context)
    values (p_device_id, 'warning', 'wifi', 'Senal WiFi debil',
            jsonb_build_object('wifi_rssi', v_rssi));
  end if;

  if v_state is not null and v_state not in ('READY','RUNNING','IDLE') then
    insert into public.system_logs (device_id, level, source, message, context)
    values (p_device_id, 'warning', 'system', 'Estado operativo anomalo',
            jsonb_build_object('state', v_state));
  end if;
end
$fn$;

-- --------------------------- Privilegios ----------------------------
-- RPCs de dispositivo: SOLO service_role (Edge Functions). No para clientes.
revoke all on function public.verify_device(text, text) from public, anon, authenticated;
revoke all on function private.apply_bin_levels(uuid, jsonb, text, timestamptz) from public, anon, authenticated;
revoke all on function public.ingest_device_event(uuid, text, text, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function public.record_heartbeat(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.verify_device(text, text) to service_role;
grant execute on function private.apply_bin_levels(uuid, jsonb, text, timestamptz) to service_role;
grant execute on function public.ingest_device_event(uuid, text, text, timestamptz, jsonb) to service_role;
grant execute on function public.record_heartbeat(uuid, jsonb) to service_role;

-- container_level_of / device_effective_status: utilidades de lectura.
revoke all on function public.container_level_of(integer) from public, anon;
grant execute on function public.container_level_of(integer) to authenticated, service_role;
revoke all on function public.device_effective_status(public.device_status, timestamptz, interval) from public, anon;
grant execute on function public.device_effective_status(public.device_status, timestamptz, interval) to authenticated, service_role;

-- rotate_device_token: SOLO service_role (script de servidor scripts/device-token).
-- No se expone a clientes autenticados para reducir superficie de ataque.
revoke all on function public.rotate_device_token(uuid) from public, anon, authenticated;
grant execute on function public.rotate_device_token(uuid) to service_role;

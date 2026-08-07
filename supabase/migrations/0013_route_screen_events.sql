-- Route classification events from a classifier device to its display device.

alter table public.devices
  add column if not exists screen_device_id uuid references public.devices(id) on delete set null;

alter table public.screen_events
  add column if not exists screen_device_id uuid references public.devices(id) on delete set null;

update public.screen_events
set screen_device_id = device_id
where screen_device_id is null;

create index if not exists idx_screen_events_screen_device_pending
  on public.screen_events(screen_device_id, screen_status, created_at);

-- Register the dedicated display used by this installation. The token is
-- generated separately and is never stored in a migration.
insert into public.devices (code, name, location, is_active)
values ('ECOSORT_PANTALLA_01', 'EcoSort pantalla', 'Pantalla principal', true)
on conflict (code) do update set is_active = true;

update public.devices classifier
set screen_device_id = screen.id
from public.devices screen
where classifier.code = 'ECOSORT-01'
  and screen.code = 'ECOSORT_PANTALLA_01';

update public.screen_events existing
set screen_device_id = classifier.screen_device_id
from public.devices classifier
where existing.device_id = classifier.id
  and classifier.screen_device_id is not null
  and existing.screen_status = 'pending';

create or replace function public.ingest_analyzed_waste(
  p_device_id uuid, p_event_id text, p_occurred_at timestamptz, p_image_url text,
  p_category public.waste_category, p_confidence numeric, p_accepted boolean,
  p_reason text, p_points integer, p_claim_token_hash text, p_qr_content text,
  p_expires_at timestamptz, p_payload jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare
  v_rows integer;
  v_classification_id uuid;
  v_screen_event_id uuid;
  v_screen_device_id uuid;
  v_event_type text;
begin
  if p_category not in ('plastic','glass','reject','unknown') then raise exception 'Categoria invalida'; end if;
  if p_confidence < 0 or p_confidence > 1 or p_points < 0 then raise exception 'Valores fuera de rango'; end if;
  if (not p_accepted and (p_points <> 0 or p_qr_content is not null or p_claim_token_hash is not null))
    or (p_accepted and (p_category not in ('plastic','glass') or p_points <= 0 or p_qr_content is null or p_claim_token_hash is null)) then raise exception 'Estado de reclamo inconsistente'; end if;

  select coalesce(d.screen_device_id, d.id)
    into v_screen_device_id
    from public.devices d
   where d.id = p_device_id;
  if v_screen_device_id is null then raise exception 'Dispositivo no encontrado'; end if;

  v_event_type := case when p_accepted then 'classification_completed' else 'classification_rejected' end;
  insert into public.device_events (event_id, device_id, "type", payload, occurred_at)
  values (p_event_id, p_device_id, v_event_type, coalesce(p_payload, '{}'::jsonb) || jsonb_build_object('image_url', p_image_url, 'material', p_category, 'confidence', p_confidence), p_occurred_at)
  on conflict (event_id) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    select c.id, s.id into v_classification_id, v_screen_event_id from public.classifications c
      left join public.screen_events s on s.classification_id = c.id where c.event_id = p_event_id limit 1;
    return jsonb_build_object('duplicate', true, 'classification_id', v_classification_id, 'screen_event_id', v_screen_event_id);
  end if;

  update public.devices set last_seen_at = greatest(coalesce(last_seen_at, p_occurred_at), p_occurred_at),
    status = case when status = 'maintenance' then status else 'online'::public.device_status end,
    model_version = coalesce(nullif(p_payload->>'model_version',''), model_version) where id = p_device_id;
  insert into public.classifications (device_id, user_id, category, confidence, eco_points_awarded, event_id)
    values (p_device_id, null, p_category, p_confidence, 0, p_event_id) returning id into v_classification_id;
  insert into public.routing_events (device_id, classification_id, category, success, error_message)
    values (p_device_id, v_classification_id, p_category, p_accepted, case when p_accepted then null else coalesce(p_reason, 'Residuo rechazado') end);
  insert into public.historial_escaneos (event_id, device_id, image_url, clasificacion, confidence, accepted, reason)
    values (p_event_id, p_device_id, p_image_url, p_category, p_confidence, p_accepted, p_reason) on conflict (event_id) do nothing;
  insert into public.screen_events (device_id, screen_device_id, state, waste_type, accepted, points, qr_content, rejection_reason, screen_status, claim_token_hash, claim_status, expires_at, classification_id)
    values (p_device_id, v_screen_device_id, case when p_accepted then 'accepted' else 'rejected' end, p_category, p_accepted,
      case when p_accepted then p_points else 0 end, case when p_accepted then p_qr_content else null end,
      case when p_accepted then null else coalesce(p_reason, 'No se pudo analizar la imagen') end, 'pending',
      case when p_accepted then p_claim_token_hash else null end, case when p_accepted then 'unclaimed' else 'skipped' end,
      case when p_accepted then p_expires_at else null end, v_classification_id) returning id into v_screen_event_id;
  return jsonb_build_object('duplicate', false, 'classification_id', v_classification_id, 'screen_event_id', v_screen_event_id);
end $fn$;

create or replace function public.ack_screen_event(p_device_id uuid, p_event_id uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare v_event public.screen_events%rowtype;
begin
  if p_status not in ('displayed','completed') then raise exception 'Estado invalido'; end if;
  select * into v_event from public.screen_events where id = p_event_id and screen_device_id = p_device_id for update;
  if not found then return jsonb_build_object('found', false); end if;
  update public.screen_events set screen_status = p_status,
    claim_status = case when p_status = 'completed' and claim_status = 'unclaimed' then 'skipped' else claim_status end
    where id = p_event_id;
  return jsonb_build_object('found', true);
end $fn$;

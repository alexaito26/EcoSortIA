-- Corrige el vínculo de idempotencia de la migración 0008 sin modificarla.
alter table public.classifications add column if not exists event_id text;
create unique index if not exists uq_classifications_event_id
  on public.classifications(event_id) where event_id is not null;

create or replace function public.ingest_analyzed_waste(
  p_device_id uuid, p_event_id text, p_occurred_at timestamptz, p_image_url text,
  p_category public.waste_category, p_confidence numeric, p_accepted boolean,
  p_reason text, p_points integer, p_claim_token_hash text, p_qr_content text,
  p_expires_at timestamptz, p_payload jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare v_rows integer; v_classification_id uuid; v_screen_event_id uuid; v_event_type text;
begin
  if p_category not in ('plastic','glass','reject','unknown') then raise exception 'Categoria invalida'; end if;
  if p_confidence < 0 or p_confidence > 1 or p_points < 0 then raise exception 'Valores fuera de rango'; end if;
  if (not p_accepted and (p_points <> 0 or p_qr_content is not null or p_claim_token_hash is not null))
    or (p_accepted and (p_category not in ('plastic','glass') or p_points <= 0 or p_qr_content is null or p_claim_token_hash is null)) then raise exception 'Estado de reclamo inconsistente'; end if;
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
  insert into public.screen_events (device_id, state, waste_type, accepted, points, qr_content, rejection_reason, screen_status, claim_token_hash, claim_status, expires_at, classification_id)
    values (p_device_id, case when p_accepted then 'accepted' else 'rejected' end, p_category, p_accepted,
      case when p_accepted then p_points else 0 end, case when p_accepted then p_qr_content else null end,
      case when p_accepted then null else coalesce(p_reason, 'No se pudo analizar la imagen') end, 'pending',
      case when p_accepted then p_claim_token_hash else null end, case when p_accepted then 'unclaimed' else 'skipped' end,
      case when p_accepted then p_expires_at else null end, v_classification_id) returning id into v_screen_event_id;
  return jsonb_build_object('duplicate', false, 'classification_id', v_classification_id, 'screen_event_id', v_screen_event_id);
end $fn$;

create or replace function public.claim_eco_points(p_token_hash text, p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare v_event public.screen_events%rowtype; v_category public.waste_category;
begin
  select * into v_event from public.screen_events where claim_token_hash = p_token_hash for update;
  if not found then return jsonb_build_object('success', false, 'error', 'QR_INVALID'); end if;
  if v_event.claim_status = 'claimed' then return jsonb_build_object('success', false, 'error', 'QR_ALREADY_CLAIMED'); end if;
  if v_event.claim_status <> 'unclaimed' then return jsonb_build_object('success', false, 'error', 'QR_UNAVAILABLE'); end if;
  if not v_event.accepted or v_event.points <= 0 then return jsonb_build_object('success', false, 'error', 'QR_NOT_ACCEPTED'); end if;
  if v_event.expires_at is null or v_event.expires_at <= now() then update public.screen_events set claim_status = 'expired' where id = v_event.id; return jsonb_build_object('success', false, 'error', 'QR_EXPIRED'); end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then return jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND'); end if;
  update public.screen_events set claim_status = 'claimed', claimed_by_user_id = p_user_id, claimed_at = now(), screen_status = 'completed' where id = v_event.id;
  update public.classifications set user_id = p_user_id where id = v_event.classification_id and user_id is null;
  update public.historial_escaneos set user_id = p_user_id where event_id = (select event_id from public.classifications where id = v_event.classification_id) and user_id is null;
  insert into public.eco_points_ledger (user_id, points, reason, classification_id) values (p_user_id, v_event.points, 'QR claim: ' || v_event.waste_type::text, v_event.classification_id)
    on conflict (classification_id) where classification_id is not null do nothing;
  if found then update public.profiles set eco_points = eco_points + v_event.points where id = p_user_id; end if;
  v_category := v_event.waste_type;
  return jsonb_build_object('success', true, 'points', v_event.points, 'category', v_category::text);
end $fn$;

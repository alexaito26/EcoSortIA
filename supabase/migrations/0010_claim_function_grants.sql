-- Privilegios de las RPCs del flujo QR: solo Edge Functions con service_role.
create or replace function public.ack_screen_event(p_device_id uuid, p_event_id uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare v_event public.screen_events%rowtype;
begin
  if p_status not in ('displayed','completed') then raise exception 'Estado invalido'; end if;
  select * into v_event from public.screen_events where id = p_event_id and device_id = p_device_id for update;
  if not found then return jsonb_build_object('found', false); end if;
  update public.screen_events set screen_status = p_status,
    claim_status = case when p_status = 'completed' and claim_status = 'unclaimed' then 'skipped' else claim_status end
    where id = p_event_id;
  return jsonb_build_object('found', true);
end $fn$;

revoke all on function public.ingest_analyzed_waste(uuid, text, timestamptz, text, public.waste_category, numeric, boolean, text, integer, text, text, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function public.claim_eco_points(text, uuid) from public, anon, authenticated;
revoke all on function public.ack_screen_event(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.ingest_analyzed_waste(uuid, text, timestamptz, text, public.waste_category, numeric, boolean, text, integer, text, text, timestamptz, jsonb) to service_role;
grant execute on function public.claim_eco_points(text, uuid) to service_role;
grant execute on function public.ack_screen_event(uuid, uuid, text) to service_role;

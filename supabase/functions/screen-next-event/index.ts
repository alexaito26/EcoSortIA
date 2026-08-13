import { authenticateDevice } from '../_shared/device-auth.ts';
import { corsHeaders, error, json } from '../_shared/http.ts';

const EVENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
const FIELDS =
  'id, state, waste_type, points, qr_content, rejection_reason, claim_status, screen_status, expires_at, created_at';

async function loadContainerLevels(
  supabase: ReturnType<typeof import('npm:@supabase/supabase-js@2').createClient>,
  screenDeviceId: string,
) {
  const { data: linkedDevices, error: devicesError } = await supabase
    .from('devices')
    .select('id')
    .eq('screen_device_id', screenDeviceId);
  if (devicesError) return { data: null, error: devicesError };

  const deviceIds = [
    screenDeviceId,
    ...(linkedDevices ?? []).map((device) => device.id as string),
  ];

  const { data, error } = await supabase
    .from('containers')
    .select('category, level, fill_percent, updated_at')
    .in('device_id', deviceIds)
    .in('category', ['plastic', 'glass', 'reject']);
  return { data, error };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return error('METHOD_NOT_ALLOWED', 405);

  const auth = await authenticateDevice(req);
  if (auth instanceof Response) return auth;

  let body: { event_id?: unknown } = {};
  try {
    if ((req.headers.get('content-type') ?? '').includes('application/json')) {
      body = await req.json();
    }
  } catch {
    return error('INVALID_JSON', 400);
  }

  const eventId = typeof body.event_id === 'string' && EVENT_ID_PATTERN.test(body.event_id)
    ? body.event_id
    : null;

  const containersResult = await loadContainerLevels(auth.supabase, auth.deviceId);
  if (containersResult.error) return error('SCREEN_QUERY_FAILED', 500);
  const containerLevels = containersResult.data ?? [];

  const query = auth.supabase
    .from('screen_events')
    .select(FIELDS)
    .eq('screen_device_id', auth.deviceId);
  const { data, error: queryError } = eventId
    ? await query.eq('id', eventId).maybeSingle()
    : await query.eq('screen_status', 'pending').order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (queryError) return error('SCREEN_QUERY_FAILED', 500);
  if (!data) return json({ has_event: false, container_levels: containerLevels });
  let event = data as Record<string, unknown>;

  if (
    event.claim_status === 'unclaimed' &&
    typeof event.expires_at === 'string' &&
    Date.parse(event.expires_at) <= Date.now()
  ) {
    const { data: expired, error: expireError } = await auth.supabase
      .from('screen_events')
      .update({ claim_status: 'expired' })
      .eq('id', event.id)
      .eq('device_id', auth.deviceId)
      .eq('claim_status', 'unclaimed')
      .select(FIELDS)
      .maybeSingle();
    if (expireError) return error('SCREEN_QUERY_FAILED', 500);
    if (expired) event = expired as Record<string, unknown>;
  }

  if (event.claim_status !== 'unclaimed') event.qr_content = null;
  return json({ has_event: true, event, container_levels: containerLevels });
});

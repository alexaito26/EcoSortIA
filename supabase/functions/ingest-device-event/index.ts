// EcoSort AI - Edge Function: ingest-device-event
// Recibe eventos del ESP32 de control (via HTTPS), autentica por token de
// dispositivo y delega la escritura atomica a la RPC ingest_device_event.
// Autenticacion propia por headers => se despliega con verify_jwt = false.
import { createClient } from "npm:@supabase/supabase-js@2";

const DEVICE_EVENT_TYPES = [
  "classification_completed",
  "classification_rejected",
  "routing_error",
  "sensor_error",
  "system_error",
];
const MATERIALS = ["plastic", "glass", "reject", "unknown"];
const BIN_KEYS = ["plastic", "glass", "reject"];
const MAX_EVENT_ID_LENGTH = 128;
const MAX_BODY_BYTES = 8 * 1024;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
function ok(event_id: string, duplicate: boolean): Response {
  return json({ success: true, duplicate, event_id }, 200);
}
function fail(error: string, status: number): Response {
  return json({ success: false, error }, status);
}

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
function isStr(v: unknown): v is string {
  return typeof v === "string";
}

type Parsed = { event_id: string; device_code: string; event_type: string; occurred_at: string; payload: Record<string, unknown> };

function validate(body: unknown): { ok: true; value: Parsed } | { ok: false } {
  if (typeof body !== "object" || body === null) return { ok: false };
  const b = body as Record<string, unknown>;
  if (!isStr(b.event_id) || b.event_id.length < 1 || b.event_id.length > MAX_EVENT_ID_LENGTH) return { ok: false };
  if (!isStr(b.device_code) || b.device_code.length < 1 || b.device_code.length > 64) return { ok: false };
  if (!isStr(b.event_type) || !DEVICE_EVENT_TYPES.includes(b.event_type)) return { ok: false };
  if (!isStr(b.occurred_at) || Number.isNaN(Date.parse(b.occurred_at))) return { ok: false };

  const payload = (typeof b.payload === "object" && b.payload !== null ? b.payload : {}) as Record<string, unknown>;

  if (payload.material !== undefined && (!isStr(payload.material) || !MATERIALS.includes(payload.material))) return { ok: false };
  if (payload.confidence !== undefined && (!isNum(payload.confidence) || payload.confidence < 0 || payload.confidence > 1)) return { ok: false };
  if (payload.processing_time_ms !== undefined && (!isNum(payload.processing_time_ms) || payload.processing_time_ms < 0)) return { ok: false };
  if (payload.eco_points !== undefined && (!isNum(payload.eco_points) || payload.eco_points < 0)) return { ok: false };
  if (payload.routing_success !== undefined && typeof payload.routing_success !== "boolean") return { ok: false };
  if (payload.user_id !== undefined && !isStr(payload.user_id)) return { ok: false };

  if (payload.bin_levels !== undefined) {
    if (typeof payload.bin_levels !== "object" || payload.bin_levels === null) return { ok: false };
    for (const [k, v] of Object.entries(payload.bin_levels as Record<string, unknown>)) {
      if (!BIN_KEYS.includes(k)) continue;
      if (!isNum(v) || v < 0 || v > 100) return { ok: false };
    }
  }

  if (b.event_type === "classification_completed" && (payload.material === undefined || payload.confidence === undefined)) return { ok: false };
  if (b.event_type === "classification_rejected" && payload.material === undefined) return { ok: false };

  return { ok: true, value: { event_id: b.event_id, device_code: b.device_code, event_type: b.event_type, occurred_at: b.occurred_at, payload } };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return fail("METHOD_NOT_ALLOWED", 405);

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) return fail("INVALID_CONTENT_TYPE", 400);

  const deviceCode = req.headers.get("x-device-code");
  const deviceToken = req.headers.get("x-device-token");
  if (!deviceCode || !deviceToken) return fail("MISSING_CREDENTIALS", 401);

  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return fail("BODY_TOO_LARGE", 413);

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return fail("INVALID_JSON", 400);
  }

  const result = validate(parsedJson);
  if (!result.ok) return fail("VALIDATION_ERROR", 400);
  const event = result.value;

  if (event.device_code !== deviceCode) return fail("DEVICE_CODE_MISMATCH", 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return fail("INTERNAL", 500);
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: auth, error: authError } = await supabase.rpc("verify_device", {
    p_code: deviceCode,
    p_token: deviceToken,
  });
  if (authError) return fail("INTERNAL", 500);

  const row = Array.isArray(auth) ? auth[0] : auth;
  if (!row || !row.found) return fail("DEVICE_NOT_FOUND", 404);
  if (!row.authenticated) return fail("INVALID_TOKEN", 401);
  if (!row.active) return fail("DEVICE_DISABLED", 403);

  const { data: ingest, error: ingestError } = await supabase.rpc("ingest_device_event", {
    p_device_id: row.device_id,
    p_event_id: event.event_id,
    p_event_type: event.event_type,
    p_occurred_at: event.occurred_at,
    p_payload: event.payload,
  });
  if (ingestError) return fail("INTERNAL", 500);

  const duplicate = Boolean(ingest?.duplicate);
  return ok(event.event_id, duplicate);
});

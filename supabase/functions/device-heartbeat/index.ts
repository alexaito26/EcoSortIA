// EcoSort AI - Edge Function: device-heartbeat
// Latido periodico del dispositivo. Autentica por token y actualiza liveness,
// firmware/modelo y niveles de contenedores via RPC record_heartbeat.
// Autenticacion propia por headers => se despliega con verify_jwt = false.
import { createClient } from "npm:@supabase/supabase-js@2";

const BIN_KEYS = ["plastic", "glass", "reject"];
const MAX_BODY_BYTES = 4 * 1024;
const NEXT_HEARTBEAT_SECONDS = 30;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
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

type Parsed = { device_code: string; payload: Record<string, unknown> };

function validate(body: unknown): { ok: true; value: Parsed } | { ok: false } {
  if (typeof body !== "object" || body === null) return { ok: false };
  const b = body as Record<string, unknown>;
  if (!isStr(b.device_code) || b.device_code.length < 1 || b.device_code.length > 64) return { ok: false };
  if (b.firmware_version !== undefined && !isStr(b.firmware_version)) return { ok: false };
  if (b.model_version !== undefined && !isStr(b.model_version)) return { ok: false };
  if (b.state !== undefined && !isStr(b.state)) return { ok: false };
  if (b.wifi_rssi !== undefined && (!isNum(b.wifi_rssi) || b.wifi_rssi < -120 || b.wifi_rssi > 0)) return { ok: false };
  if (b.uptime_seconds !== undefined && (!isNum(b.uptime_seconds) || b.uptime_seconds < 0)) return { ok: false };
  if (b.free_heap !== undefined && (!isNum(b.free_heap) || b.free_heap < 0)) return { ok: false };
  if (b.bin_levels !== undefined) {
    if (typeof b.bin_levels !== "object" || b.bin_levels === null) return { ok: false };
    for (const [k, v] of Object.entries(b.bin_levels as Record<string, unknown>)) {
      if (!BIN_KEYS.includes(k)) continue;
      if (!isNum(v) || v < 0 || v > 100) return { ok: false };
    }
  }
  const { device_code, ...payload } = b;
  return { ok: true, value: { device_code, payload } };
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
  if (result.value.device_code !== deviceCode) return fail("DEVICE_CODE_MISMATCH", 400);

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

  const { error: hbError } = await supabase.rpc("record_heartbeat", {
    p_device_id: row.device_id,
    p_payload: result.value.payload,
  });
  if (hbError) return fail("INTERNAL", 500);

  return json(
    {
      success: true,
      server_time: new Date().toISOString(),
      next_heartbeat_seconds: NEXT_HEARTBEAT_SECONDS,
    },
    200,
  );
});

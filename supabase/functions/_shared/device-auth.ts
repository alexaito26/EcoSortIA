import { createClient } from "npm:@supabase/supabase-js@2";

export type DeviceAuth = { deviceId: string; code: string; supabase: ReturnType<typeof createClient> };

export async function authenticateDevice(req: Request): Promise<DeviceAuth | Response> {
  const code = req.headers.get("x-device-code");
  const token = req.headers.get("x-device-token");
  if (!code || !token) return new Response(JSON.stringify({ success: false, error: "MISSING_CREDENTIALS" }), { status: 401 });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) return new Response(JSON.stringify({ success: false, error: "INTERNAL" }), { status: 500 });
  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("verify_device", { p_code: code, p_token: token });
  const row = Array.isArray(data) ? data[0] : data;
  if (error) return new Response(JSON.stringify({ success: false, error: "INTERNAL" }), { status: 500 });
  if (!row?.found) return new Response(JSON.stringify({ success: false, error: "DEVICE_NOT_FOUND" }), { status: 404 });
  if (!row.authenticated) return new Response(JSON.stringify({ success: false, error: "INVALID_TOKEN" }), { status: 401 });
  if (!row.active) return new Response(JSON.stringify({ success: false, error: "DEVICE_DISABLED" }), { status: 403 });
  return { deviceId: row.device_id as string, code, supabase };
}

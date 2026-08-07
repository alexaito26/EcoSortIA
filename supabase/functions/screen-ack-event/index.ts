import { authenticateDevice } from "../_shared/device-auth.ts";
import { corsHeaders, error, json } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return error("METHOD_NOT_ALLOWED", 405);
  const auth = await authenticateDevice(req);
  if (auth instanceof Response) return auth;
  let body: { event_id?: unknown; status?: unknown };
  try { body = await req.json(); } catch { return error("INVALID_JSON", 400); }
  if (typeof body.event_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(body.event_id) || (body.status !== "displayed" && body.status !== "completed")) return error("VALIDATION_ERROR", 400);
  const { data, error: rpcError } = await auth.supabase.rpc("ack_screen_event", { p_device_id: auth.deviceId, p_event_id: body.event_id, p_status: body.status });
  if (rpcError) return error("SCREEN_ACK_FAILED", 500);
  if (!data?.found) return error("SCREEN_EVENT_NOT_FOUND", 404);
  return json({ success: true, event_id: body.event_id, status: body.status });
});

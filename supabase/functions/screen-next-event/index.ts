import { authenticateDevice } from "../_shared/device-auth.ts";
import { corsHeaders, error, json } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return error("METHOD_NOT_ALLOWED", 405);
  const auth = await authenticateDevice(req);
  if (auth instanceof Response) return auth;
  // Una pantalla se registra con el mismo device_code de la estación que
  // atiende; por eso nunca puede obtener eventos de otra estación.
  const { data, error: queryError } = await auth.supabase.from("screen_events")
    .select("id, state, waste_type, points, qr_content, rejection_reason, claim_status, created_at")
    .eq("device_id", auth.deviceId).eq("screen_status", "pending").order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (queryError) return error("SCREEN_QUERY_FAILED", 500);
  return json(data ? { has_event: true, event: data } : { has_event: false });
});

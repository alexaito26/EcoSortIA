import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, error, json } from "../_shared/http.ts";

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function readDefaultKey(name: string): string | null {
  const raw = Deno.env.get(name);
  if (!raw) return null;
  try {
    const values = JSON.parse(raw) as Record<string, unknown>;
    if (typeof values.default === "string") return values.default;
    const first = Object.values(values).find((value) => typeof value === "string");
    return typeof first === "string" ? first : null;
  } catch {
    return null;
  }
}

const messages: Record<string, string> = {
  QR_INVALID: "QR inválido.", QR_EXPIRED: "El QR expiró.", QR_ALREADY_CLAIMED: "Los puntos de este QR ya fueron reclamados.",
  QR_UNAVAILABLE: "Este QR ya no está disponible.", QR_NOT_ACCEPTED: "Este residuo no genera EcoPuntos.", USER_NOT_FOUND: "No se encontró tu perfil.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return error("METHOD_NOT_ALLOWED", 405);
  const authHeader = req.headers.get("authorization");
  const url = Deno.env.get("ECOSORT_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("ECOSORT_SUPABASE_ANON_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY") ??
    readDefaultKey("SUPABASE_PUBLISHABLE_KEYS");
  const serviceRoleKey = Deno.env.get("ECOSORT_SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    readDefaultKey("SUPABASE_SECRET_KEYS");
  if (!authHeader) return error("UNAUTHORIZED", 401);
  if (!url || !anonKey || !serviceRoleKey) return error("CLAIM_NOT_CONFIGURED", 500);
  let body: { token?: unknown };
  try { body = await req.json(); } catch { return error("INVALID_JSON", 400); }
  if (typeof body.token !== "string" || body.token.length < 24 || body.token.length > 256) return error("QR_INVALID", 400);

  const userClient = createClient(url, anonKey, { global: { headers: { authorization: authHeader } }, auth: { persistSession: false } });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return error("UNAUTHORIZED", 401);

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const { data, error: rpcError } = await admin.rpc("claim_eco_points", { p_token_hash: await sha256(body.token), p_user_id: user.id });
  if (rpcError) return error("CLAIM_FAILED", 500);
  if (!data?.success) {
    const code = typeof data?.error === "string" ? data.error : "CLAIM_FAILED";
    return json({ success: false, error: code, message: messages[code] ?? "No se pudo reclamar." }, code === "QR_INVALID" ? 404 : 409);
  }
  const category = data.category === "glass" ? "vidrio" : "plástico";
  return json({ success: true, points: data.points, category: data.category, message: `Ganaste ${data.points} EcoPuntos por reciclar ${category}` });
});

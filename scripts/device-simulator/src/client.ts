import type { SimConfig } from "./config";

export type ApiResult = { status: number; body: unknown };

function headers(cfg: SimConfig): Record<string, string> {
  const h: Record<string, string> = {
    "content-type": "application/json",
    "x-device-code": cfg.code,
    "x-device-token": cfg.token,
  };
  // Algunos gateways de Supabase exigen apikey aunque verify_jwt este desactivado.
  if (cfg.anonKey) {
    h["apikey"] = cfg.anonKey;
    h["authorization"] = `Bearer ${cfg.anonKey}`;
  }
  return h;
}

async function post(url: string, cfg: SimConfig, body: unknown): Promise<ApiResult> {
  const res = await fetch(url, {
    method: "POST",
    headers: headers(cfg),
    body: JSON.stringify(body),
  });
  let parsed: unknown = null;
  const text = await res.text();
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

export function sendEvent(cfg: SimConfig, body: unknown): Promise<ApiResult> {
  return post(`${cfg.baseUrl}/ingest-device-event`, cfg, body);
}

export function sendHeartbeat(cfg: SimConfig, body: unknown): Promise<ApiResult> {
  return post(`${cfg.baseUrl}/device-heartbeat`, cfg, body);
}

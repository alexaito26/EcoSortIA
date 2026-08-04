/** Simulador final: la categoría siempre la decide analyze-waste-image/OpenAI. */
import { randomUUID } from "node:crypto";
import { loadConfig } from "./config";
import { sendHeartbeat } from "./client";

function eventId() { return `img-${randomUUID()}`; }
async function imageAnalysis(id: string) {
  const cfg = loadConfig(); const imageUrl = process.env.TEST_IMAGE_URL;
  if (!imageUrl) throw new Error("Falta TEST_IMAGE_URL; no se permite clasificación aleatoria.");
  const headers: Record<string, string> = { "content-type": "application/json", "x-device-code": cfg.code, "x-device-token": cfg.token };
  if (cfg.anonKey) { headers.apikey = cfg.anonKey; headers.authorization = `Bearer ${cfg.anonKey}`; }
  const response = await fetch(`${cfg.baseUrl}/analyze-waste-image`, { method: "POST", headers, body: JSON.stringify({ event_id: id, device_code: cfg.code, image_url: imageUrl, occurred_at: new Date().toISOString() }) });
  console.log(`HTTP ${response.status} ${await response.text()}`);
}
async function main() {
  const command = process.argv[2] ?? "event";
  if (command === "event") return imageAnalysis(eventId());
  if (command === "duplicate") { const id = eventId(); await imageAnalysis(id); return imageAnalysis(id); }
  if (command === "heartbeat") {
    const cfg = loadConfig(); const result = await sendHeartbeat(cfg, { device_code: cfg.code, state: "READY", firmware_version: "1.1.0-openai", model_version: process.env.OPENAI_MODEL ?? "gpt-4.1-mini", wifi_rssi: -58, uptime_seconds: Math.floor(process.uptime()), free_heap: 180000, bin_levels: { plastic: 20, glass: 12, reject: 8 } });
    console.log(`HTTP ${result.status} ${JSON.stringify(result.body)}`); return;
  }
  throw new Error("Comandos: event | duplicate | heartbeat");
}
main().catch((cause) => { console.error(cause instanceof Error ? cause.message : cause); process.exit(1); });

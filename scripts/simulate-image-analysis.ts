import { config } from "dotenv";
import { randomUUID } from "node:crypto";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const baseUrl = (process.env.SUPABASE_FUNCTIONS_URL ?? process.env.ECOSORT_API_BASE_URL ?? "").replace(/\/$/, "");
const deviceCode = process.env.DEVICE_CODE ?? process.env.ECOSORT_DEVICE_CODE ?? "ECOSORT-01";
const token = process.env.DEVICE_TOKEN ?? process.env.ECOSORT_DEVICE_TOKEN;
const imageUrl = process.env.TEST_IMAGE_URL;
const eventId = process.env.TEST_EVENT_ID ?? `img-${randomUUID()}`;

if (!baseUrl || !token || !imageUrl) {
  throw new Error("Faltan SUPABASE_FUNCTIONS_URL, DEVICE_TOKEN o TEST_IMAGE_URL.");
}

const headers: Record<string, string> = { "content-type": "application/json", "x-device-code": deviceCode, "x-device-token": token };
if (process.env.ECOSORT_ANON_KEY) { headers.apikey = process.env.ECOSORT_ANON_KEY; headers.authorization = `Bearer ${process.env.ECOSORT_ANON_KEY}`; }
const response = await fetch(`${baseUrl}/analyze-waste-image`, { method: "POST", headers, body: JSON.stringify({ event_id: eventId, device_code: deviceCode, image_url: imageUrl, occurred_at: new Date().toISOString() }) });
const text = await response.text();
let body: unknown = text;
try { body = JSON.parse(text); } catch { /* conservar respuesta */ }
console.log(JSON.stringify({ event_id: eventId, image_url: imageUrl, http_status: response.status, response: body }, null, 2));

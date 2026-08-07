import { config } from "dotenv";
import { randomUUID } from "node:crypto";
config({ path: ".env" }); config({ path: ".env.local", override: true });
const base = (process.env.SUPABASE_FUNCTIONS_URL ?? process.env.ECOSORT_API_BASE_URL ?? "").replace(/\/$/, "");
const code = process.env.DEVICE_CODE ?? process.env.ECOSORT_DEVICE_CODE ?? "ECOSORT-01";
const token = process.env.DEVICE_TOKEN ?? process.env.ECOSORT_DEVICE_TOKEN; const image = process.env.TEST_IMAGE_URL;
if (!base || !token || !image) throw new Error("Faltan SUPABASE_FUNCTIONS_URL, DEVICE_TOKEN o TEST_IMAGE_URL.");
const id = `img-${randomUUID()}`; const headers: Record<string, string> = { "content-type": "application/json", "x-device-code": code, "x-device-token": token };
if (process.env.ECOSORT_ANON_KEY) { headers.apikey = process.env.ECOSORT_ANON_KEY; headers.authorization = `Bearer ${process.env.ECOSORT_ANON_KEY}`; }
for (let attempt = 1; attempt <= 2; attempt++) {
  const response = await fetch(`${base}/analyze-waste-image`, { method: "POST", headers, body: JSON.stringify({ event_id: id, device_code: code, image_url: image, occurred_at: new Date().toISOString() }) });
  console.log(`attempt=${attempt} status=${response.status} ${await response.text()}`);
}

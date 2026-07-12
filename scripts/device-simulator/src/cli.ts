/**
 * EcoSort AI - Simulador de dispositivo (Fase 4).
 * Representa al ESP32 de control enviando eventos y latidos a las Edge Functions.
 * Nunca imprime el token.
 */
import { randomUUID } from "node:crypto";
import { BIN_KEYS, DEVICE_EVENT_TYPES, type DeviceMaterial } from "@ecosort/shared";
import { loadConfig, type SimConfig } from "./config";
import { sendEvent, sendHeartbeat, type ApiResult } from "./client";

type Flags = Record<string, string | boolean>;

function parseFlags(argv: string[]): Flags {
  const flags: Flags = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      flags[key] = true;
    } else {
      flags[key] = next;
      i++;
    }
  }
  return flags;
}

function str(flags: Flags, key: string): string | undefined {
  const v = flags[key];
  return typeof v === "string" ? v : undefined;
}
function num(flags: Flags, key: string): number | undefined {
  const v = flags[key];
  return typeof v === "string" ? Number(v) : undefined;
}
function bool(flags: Flags, key: string, fallback: boolean): boolean {
  const v = flags[key];
  if (v === undefined) return fallback;
  if (typeof v === "boolean") return v;
  return v === "true" || v === "1";
}

const BINS = BIN_KEYS;
const levels: Record<string, number> = { plastic: 20, glass: 12, reject: 8 };

function bumpLevels(material: DeviceMaterial): Record<string, number> {
  if (material in levels) {
    levels[material] = Math.min(100, levels[material] + Math.floor(Math.random() * 8) + 2);
  }
  return { ...levels };
}

function pickMaterial(flag?: string): DeviceMaterial {
  if (flag && flag !== "random" && BINS.includes(flag as (typeof BINS)[number])) {
    return flag as DeviceMaterial;
  }
  return BINS[Math.floor(Math.random() * BINS.length)];
}

function newEventId(): string {
  return `evt-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 8)}`;
}

function summarize(label: string, result: ApiResult): void {
  const body = result.body as { duplicate?: boolean; error?: string } | null;
  const dup = body?.duplicate ? " (duplicado)" : "";
  const err = body?.error ? ` error=${body.error}` : "";
  console.log(`[${label}] HTTP ${result.status}${dup}${err}`);
}

function buildClassification(flags: Flags, eventId?: string) {
  const material = pickMaterial(str(flags, "material"));
  const routingSuccess = bool(flags, "routing-success", true);
  const confidence = num(flags, "confidence") ?? Number((0.85 + Math.random() * 0.14).toFixed(3));
  const userId = str(flags, "user-id");
  return {
    event_id: eventId ?? newEventId(),
    device_code: process.env.ECOSORT_DEVICE_CODE ?? "ECOSORT-01",
    event_type: "classification_completed" as const,
    occurred_at: new Date().toISOString(),
    payload: {
      material,
      confidence,
      model_version: "yolov8n-v3",
      routed_to: `${material}_bin`,
      routing_success: routingSuccess,
      processing_time_ms: 1000 + Math.floor(Math.random() * 900),
      eco_points: material === "reject" ? 0 : 10,
      servo_target: 45,
      ...(userId ? { user_id: userId } : {}),
      bin_levels: bumpLevels(material),
    },
  };
}

function buildHeartbeat(flags: Flags) {
  return {
    device_code: process.env.ECOSORT_DEVICE_CODE ?? "ECOSORT-01",
    firmware_version: str(flags, "firmware") ?? "1.0.0",
    model_version: "yolov8n-v3",
    state: str(flags, "state") ?? "READY",
    wifi_rssi: num(flags, "rssi") ?? -58,
    uptime_seconds: Math.floor(process.uptime()) + 3000,
    free_heap: 180000,
    bin_levels: { ...levels },
  };
}

async function cmdEvent(cfg: SimConfig, flags: Flags): Promise<void> {
  const body = buildClassification(flags);
  summarize(`event:${body.payload.material}`, await sendEvent(cfg, body));
}

async function cmdHeartbeat(cfg: SimConfig, flags: Flags): Promise<void> {
  summarize("heartbeat", await sendHeartbeat(cfg, buildHeartbeat(flags)));
}

async function cmdError(cfg: SimConfig, flags: Flags): Promise<void> {
  const kind = str(flags, "kind") ?? "routing";
  const map: Record<string, { type: string; message: string }> = {
    routing: { type: "routing_error", message: "Fallo de servo: no alcanzo la posicion objetivo" },
    sensor: { type: "sensor_error", message: "Lectura de sensor fuera de rango" },
    system: { type: "system_error", message: "Excepcion no controlada en el firmware" },
  };
  const chosen = map[kind] ?? map.routing;
  if (!DEVICE_EVENT_TYPES.includes(chosen.type as (typeof DEVICE_EVENT_TYPES)[number])) return;
  const body = {
    event_id: newEventId(),
    device_code: cfg.code,
    event_type: chosen.type,
    occurred_at: new Date().toISOString(),
    payload: {
      material: "reject",
      message: chosen.message,
      error_code: kind.toUpperCase(),
    },
  };
  summarize(`error:${kind}`, await sendEvent(cfg, body));
}

async function cmdDuplicate(cfg: SimConfig, flags: Flags): Promise<void> {
  const eventId = newEventId();
  const body = buildClassification(flags, eventId);
  console.log(`Enviando event_id ${eventId} dos veces...`);
  summarize("duplicate:1", await sendEvent(cfg, body));
  summarize("duplicate:2", await sendEvent(cfg, { ...body, occurred_at: new Date().toISOString() }));
}

async function cmdStream(cfg: SimConfig, flags: Flags): Promise<void> {
  const interval = (num(flags, "interval") ?? 30) * 1000;
  const maxCount = num(flags, "count");
  let sent = 0;
  let running = true;

  process.on("SIGINT", () => {
    running = false;
    console.log("\nDeteniendo stream...");
  });

  console.log(`Stream iniciado (intervalo ${interval / 1000}s). Ctrl+C para detener.`);
  while (running && (maxCount === undefined || sent < maxCount)) {
    await cmdHeartbeat(cfg, flags);
    await cmdEvent(cfg, flags);
    sent++;
    if (maxCount !== undefined && sent >= maxCount) break;
    await new Promise((r) => setTimeout(r, interval));
  }
  console.log(`Stream finalizado. Ciclos enviados: ${sent}.`);
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  const flags = parseFlags(rest);

  if (!command) {
    console.log("Comandos: event | heartbeat | stream | error | duplicate");
    return;
  }

  const cfg = loadConfig();

  switch (command) {
    case "event":
      return cmdEvent(cfg, flags);
    case "heartbeat":
      return cmdHeartbeat(cfg, flags);
    case "stream":
      return cmdStream(cfg, flags);
    case "error":
      return cmdError(cfg, flags);
    case "duplicate":
      return cmdDuplicate(cfg, flags);
    default:
      console.error(`Comando desconocido: ${command}`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : "Error inesperado.");
  process.exit(1);
});

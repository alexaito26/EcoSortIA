import { z } from "zod";
import { WASTE_CATEGORIES } from "./enums";

/**
 * Contrato IoT de la Fase 4. Fuente unica de verdad para el simulador y las
 * pruebas. Las Edge Functions replican estas reglas de validacion (Deno no
 * puede importar el workspace, pero deben mantener paridad con este archivo).
 */

/** Tipos de evento aceptados por `ingest-device-event`. */
export const DEVICE_EVENT_TYPES = [
  "classification_completed",
  "classification_rejected",
  "routing_error",
  "sensor_error",
  "system_error",
] as const;
export type DeviceEventType = (typeof DEVICE_EVENT_TYPES)[number];

/** Materiales permitidos (coinciden con waste_category). */
export const DEVICE_MATERIALS = WASTE_CATEGORIES;
export type DeviceMaterial = (typeof DEVICE_MATERIALS)[number];

/** Categorias con contenedor fisico (sin 'unknown'). */
export const BIN_KEYS = ["plastic", "glass", "reject"] as const;
export type BinKey = (typeof BIN_KEYS)[number];

/** Limites de seguridad. */
export const MAX_EVENT_ID_LENGTH = 128;
export const MAX_BODY_BYTES = 8 * 1024; // 8 KB
export const HEARTBEAT_INTERVAL_SECONDS = 30;
export const OFFLINE_THRESHOLD_SECONDS = 90;

export const deviceMaterialSchema = z.enum(DEVICE_MATERIALS);
export const deviceEventTypeSchema = z.enum(DEVICE_EVENT_TYPES);

const isoDateTime = z.string().datetime({ offset: true });
const fillLevel = z.number().int().min(0).max(100);

/** Niveles de contenedores 0-100 (claves plastic/glass/reject). */
export const binLevelsSchema = z.record(z.string(), fillLevel);
export type BinLevels = z.infer<typeof binLevelsSchema>;

export const ingestPayloadSchema = z.object({
  material: deviceMaterialSchema.optional(),
  confidence: z.number().min(0).max(1).optional(),
  model_version: z.string().max(64).optional(),
  firmware_version: z.string().max(64).optional(),
  routed_to: z.string().max(64).optional(),
  routing_success: z.boolean().optional(),
  processing_time_ms: z.number().min(0).optional(),
  eco_points: z.number().int().min(0).optional(),
  servo_target: z.number().optional(),
  user_id: z.string().uuid().optional(),
  bin_levels: binLevelsSchema.optional(),
  message: z.string().max(500).optional(),
  error_code: z.string().max(64).optional(),
});
export type IngestPayload = z.infer<typeof ingestPayloadSchema>;

/** Body completo de `ingest-device-event`. */
export const ingestEventSchema = z
  .object({
    event_id: z.string().min(1).max(MAX_EVENT_ID_LENGTH),
    device_code: z.string().min(1).max(64),
    event_type: deviceEventTypeSchema,
    occurred_at: isoDateTime,
    payload: ingestPayloadSchema.default({}),
  })
  .superRefine((data, ctx) => {
    if (data.event_type === "classification_completed") {
      if (!data.payload.material) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["payload", "material"],
          message: "material es obligatorio para classification_completed",
        });
      }
      if (data.payload.confidence === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["payload", "confidence"],
          message: "confidence es obligatorio para classification_completed",
        });
      }
    }
    if (data.event_type === "classification_rejected" && !data.payload.material) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["payload", "material"],
        message: "material es obligatorio para classification_rejected",
      });
    }
  });
export type IngestEvent = z.infer<typeof ingestEventSchema>;

/** Body completo de `device-heartbeat`. */
export const heartbeatSchema = z.object({
  device_code: z.string().min(1).max(64),
  firmware_version: z.string().max(64).optional(),
  model_version: z.string().max(64).optional(),
  state: z.string().max(32).optional(),
  wifi_rssi: z.number().int().min(-120).max(0).optional(),
  uptime_seconds: z.number().int().min(0).optional(),
  free_heap: z.number().int().min(0).optional(),
  bin_levels: binLevelsSchema.optional(),
});
export type Heartbeat = z.infer<typeof heartbeatSchema>;

/** Respuesta uniforme de las Edge Functions. */
export type IngestResponse = {
  success: boolean;
  duplicate?: boolean;
  event_id?: string;
  error?: string;
};

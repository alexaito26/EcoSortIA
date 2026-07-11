import { z } from "zod";
import {
  CONTAINER_LEVELS,
  DEVICE_STATUSES,
  EVENT_TYPES,
  LOG_LEVELS,
  LOG_SOURCES,
  USER_ROLES,
  WASTE_CATEGORIES,
} from "./enums";

/**
 * Esquemas Zod compartidos. Sirven para validar payloads en el borde
 * (Edge Functions, simulador) y datos recuperados de almacenamiento local
 * en la PWA. La autorizacion real siempre recae en RLS de Supabase.
 */

export const wasteCategorySchema = z.enum(WASTE_CATEGORIES);
export const deviceStatusSchema = z.enum(DEVICE_STATUSES);
export const eventTypeSchema = z.enum(EVENT_TYPES);
export const containerLevelSchema = z.enum(CONTAINER_LEVELS);
export const userRoleSchema = z.enum(USER_ROLES);
export const logLevelSchema = z.enum(LOG_LEVELS);
export const logSourceSchema = z.enum(LOG_SOURCES);

/**
 * Evento crudo enviado por un dispositivo ESP32 hacia la Edge Function
 * `ingest-device-event` (Fase 4). `event_id` garantiza idempotencia.
 */
export const deviceEventSchema = z.object({
  event_id: z.string().uuid(),
  device_id: z.string().min(1),
  type: eventTypeSchema,
  category: wasteCategorySchema.optional(),
  container_level: containerLevelSchema.optional(),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  occurred_at: z.string().datetime(),
});
export type DeviceEvent = z.infer<typeof deviceEventSchema>;

/** Latido periodico del dispositivo (Edge Function `device-heartbeat`). */
export const deviceHeartbeatSchema = z.object({
  device_id: z.string().min(1),
  status: deviceStatusSchema,
  firmware_version: z.string().optional(),
  uptime_seconds: z.number().int().nonnegative().optional(),
  reported_at: z.string().datetime(),
});
export type DeviceHeartbeat = z.infer<typeof deviceHeartbeatSchema>;

/**
 * Totales agregados del usuario autenticado que la PWA puede almacenar
 * offline (datos NO sensibles, ya filtrados por RLS antes de guardarse).
 */
export const userAggregateSchema = z.object({
  eco_points: z.number().int().nonnegative(),
  total_classifications: z.number().int().nonnegative(),
  by_category: z.record(wasteCategorySchema, z.number().int().nonnegative()),
  synced_at: z.string().datetime(),
});
export type UserAggregate = z.infer<typeof userAggregateSchema>;

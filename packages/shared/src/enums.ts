/**
 * Enumeraciones compartidas del dominio EcoSort AI.
 * Se usan tanto en la app web como en el backend/simulador para mantener
 * un unico origen de verdad. Los valores string coinciden con los enums
 * de PostgreSQL definidos en las migraciones de la Fase 2.
 */

/** Categorias de residuo que el dispositivo puede clasificar/rutear. */
export const WASTE_CATEGORIES = ["plastic", "glass", "reject", "unknown"] as const;
export type WasteCategory = (typeof WASTE_CATEGORIES)[number];

/** Estado de conectividad/operacion de un dispositivo ESP32. */
export const DEVICE_STATUSES = ["online", "offline", "maintenance", "error"] as const;
export type DeviceStatus = (typeof DEVICE_STATUSES)[number];

/** Tipos de evento que un dispositivo envia al backend. */
export const EVENT_TYPES = [
  "classification",
  "routing",
  "heartbeat",
  "container_warning",
  "container_full",
  "sensor_error",
  "servo_error",
  "maintenance_required",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Nivel de llenado de un contenedor. */
export const CONTAINER_LEVELS = ["empty", "normal", "warning", "full"] as const;
export type ContainerLevel = (typeof CONTAINER_LEVELS)[number];

/** Roles de usuario de la aplicacion (autorizacion via RLS en Supabase). */
export const USER_ROLES = ["admin", "operator", "viewer", "user"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Severidad de un log del sistema. */
export const LOG_LEVELS = ["debug", "info", "warning", "error", "critical"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

/** Origen/subsistema que produce un log. */
export const LOG_SOURCES = ["wifi", "uart", "servo", "sensor", "network", "system"] as const;
export type LogSource = (typeof LOG_SOURCES)[number];

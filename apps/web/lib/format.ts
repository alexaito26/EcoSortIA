import {
  OFFLINE_THRESHOLD_SECONDS,
  type ContainerLevel,
  type DeviceStatus,
  type LogLevel,
  type LogSource,
  type UserRole,
  type WasteCategory,
} from "@ecosort/shared";

type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "success"
  | "warning"
  | "destructive"
  | "info";

export const CATEGORY_LABELS: Record<WasteCategory, string> = {
  plastic: "Plastico",
  glass: "Vidrio",
  reject: "Rechazo",
  unknown: "Desconocido",
};

export const CATEGORY_COLORS: Record<WasteCategory, string> = {
  plastic: "var(--chart-1)",
  glass: "var(--chart-2)",
  reject: "var(--chart-3)",
  unknown: "var(--chart-4)",
};

export const DEVICE_STATUS_LABELS: Record<DeviceStatus, string> = {
  online: "En linea",
  offline: "Desconectado",
  maintenance: "Mantenimiento",
  error: "Error",
};

export const DEVICE_STATUS_VARIANTS: Record<DeviceStatus, BadgeVariant> = {
  online: "success",
  offline: "secondary",
  maintenance: "warning",
  error: "destructive",
};

export const CONTAINER_LEVEL_LABELS: Record<ContainerLevel, string> = {
  empty: "Vacio",
  normal: "Normal",
  warning: "Casi lleno",
  full: "Lleno",
};

export const CONTAINER_LEVEL_VARIANTS: Record<ContainerLevel, BadgeVariant> = {
  empty: "secondary",
  normal: "success",
  warning: "warning",
  full: "destructive",
};

export const LOG_LEVEL_LABELS: Record<LogLevel, string> = {
  debug: "Debug",
  info: "Info",
  warning: "Aviso",
  error: "Error",
  critical: "Critico",
};

export const LOG_LEVEL_VARIANTS: Record<LogLevel, BadgeVariant> = {
  debug: "outline",
  info: "info",
  warning: "warning",
  error: "destructive",
  critical: "destructive",
};

export const LOG_SOURCE_LABELS: Record<LogSource, string> = {
  wifi: "WiFi",
  uart: "UART",
  servo: "Servo",
  sensor: "Sensor",
  network: "Red",
  system: "Sistema",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  operator: "Operador",
  viewer: "Observador",
  user: "Usuario",
};

export const ROLE_VARIANTS: Record<UserRole, BadgeVariant> = {
  admin: "default",
  operator: "info",
  viewer: "secondary",
  user: "outline",
};

const dateTimeFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return dateTimeFormatter.format(date);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return dateFormatter.format(date);
}

export function formatRelative(value: string | null | undefined): string {
  if (!value) return "nunca";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "nunca";
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return "hace unos segundos";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  return `hace ${diffDays} d`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `${Math.round(value)}%`;
}

export function formatConfidence(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `${Math.round(value * 100)}%`;
}

/**
 * Estado efectivo del dispositivo: si no hay latido reciente se considera
 * offline aunque el registro diga 'online'. Respeta estados manuales
 * (maintenance/error). Umbral: OFFLINE_THRESHOLD_SECONDS (90 s).
 */
export function effectiveDeviceStatus(
  status: DeviceStatus,
  lastSeenAt: string | null | undefined,
): DeviceStatus {
  if (status === "maintenance" || status === "error") return status;
  if (!lastSeenAt) return "offline";
  const ageSeconds = (Date.now() - new Date(lastSeenAt).getTime()) / 1000;
  return ageSeconds > OFFLINE_THRESHOLD_SECONDS ? "offline" : "online";
}

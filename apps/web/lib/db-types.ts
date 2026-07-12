import type {
  ContainerLevel,
  DeviceStatus,
  LogLevel,
  LogSource,
  UserRole,
  WasteCategory,
} from "@ecosort/shared";

export type ClassificationRow = {
  id: string;
  device_id: string | null;
  user_id: string | null;
  category: WasteCategory;
  confidence: number | null;
  eco_points_awarded: number;
  created_at: string;
};

export type RoutingEventRow = {
  id: string;
  device_id: string | null;
  classification_id: string | null;
  category: WasteCategory;
  success: boolean;
  error_message: string | null;
  created_at: string;
};

export type DeviceRow = {
  id: string;
  code: string;
  name: string | null;
  location: string | null;
  status: DeviceStatus;
  firmware_version: string | null;
  last_seen_at: string | null;
  created_at: string;
};

export type ContainerRow = {
  id: string;
  device_id: string | null;
  category: WasteCategory;
  level: ContainerLevel;
  fill_percent: number;
  updated_at: string | null;
};

export type SystemLogRow = {
  id: string;
  device_id: string | null;
  level: LogLevel;
  source: LogSource;
  message: string;
  context: Record<string, unknown> | null;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  eco_points: number;
  created_at: string;
};

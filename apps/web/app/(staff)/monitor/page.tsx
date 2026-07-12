import { requireRole } from "@/lib/auth/session";
import { ROLE_ACCESS } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import type { ClassificationRow, ContainerRow, DeviceRow } from "@/lib/db-types";
import { MonitorRealtime } from "@/components/staff/monitor-realtime";

export const dynamic = "force-dynamic";

export default async function MonitorPage() {
  await requireRole(ROLE_ACCESS["/monitor"]);
  const supabase = await createClient();

  const [devicesRes, containersRes, classificationsRes] = await Promise.all([
    supabase
      .from("devices")
      .select("id, code, name, location, status, firmware_version, last_seen_at, created_at")
      .order("code"),
    supabase
      .from("containers")
      .select("id, device_id, category, level, fill_percent, updated_at")
      .order("category"),
    supabase
      .from("classifications")
      .select("id, device_id, user_id, category, confidence, eco_points_awarded, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <MonitorRealtime
      initialDevices={(devicesRes.data ?? []) as DeviceRow[]}
      initialContainers={(containersRes.data ?? []) as ContainerRow[]}
      initialClassifications={(classificationsRes.data ?? []) as ClassificationRow[]}
    />
  );
}

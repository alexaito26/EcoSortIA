import { Cpu, MapPin } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { ROLE_ACCESS } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import {
  CATEGORY_LABELS,
  CONTAINER_LEVEL_LABELS,
  CONTAINER_LEVEL_VARIANTS,
  DEVICE_STATUS_LABELS,
  DEVICE_STATUS_VARIANTS,
  effectiveDeviceStatus,
  formatPercent,
  formatRelative,
} from "@/lib/format";
import type { ContainerRow, DeviceRow } from "@/lib/db-types";
import { PageHeader } from "@/components/staff/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function DevicesPage() {
  await requireRole(ROLE_ACCESS["/devices"]);
  const supabase = await createClient();

  const [devicesRes, containersRes] = await Promise.all([
    supabase
      .from("devices")
      .select("id, code, name, location, status, firmware_version, last_seen_at, created_at")
      .order("code"),
    supabase
      .from("containers")
      .select("id, device_id, category, level, fill_percent, updated_at")
      .order("category"),
  ]);

  const devices = (devicesRes.data ?? []) as DeviceRow[];
  const containers = (containersRes.data ?? []) as ContainerRow[];

  return (
    <div>
      <PageHeader
        title="Dispositivos"
        description="Estaciones EcoSort registradas y el estado de sus contenedores."
      />

      {devices.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No hay dispositivos registrados.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {devices.map((device) => {
            const deviceContainers = containers.filter((c) => c.device_id === device.id);
            const status = effectiveDeviceStatus(device.status, device.last_seen_at);
            return (
              <Card key={device.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Cpu className="h-5 w-5" />
                      </span>
                      <div>
                        <CardTitle className="text-base">{device.name ?? device.code}</CardTitle>
                        <p className="text-xs text-muted-foreground">{device.code}</p>
                      </div>
                    </div>
                    <Badge variant={DEVICE_STATUS_VARIANTS[status]}>
                      {DEVICE_STATUS_LABELS[status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate">{device.location ?? "Sin ubicacion"}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Firmware: {device.firmware_version ?? "-"}
                    </div>
                    <div className="text-muted-foreground">
                      Visto {formatRelative(device.last_seen_at)}
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-border pt-3">
                    {deviceContainers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin contenedores.</p>
                    ) : (
                      deviceContainers.map((container) => (
                        <div key={container.id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">
                              {CATEGORY_LABELS[container.category]}
                            </span>
                            <Badge variant={CONTAINER_LEVEL_VARIANTS[container.level]}>
                              {CONTAINER_LEVEL_LABELS[container.level]} -{" "}
                              {formatPercent(container.fill_percent)}
                            </Badge>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${container.fill_percent}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

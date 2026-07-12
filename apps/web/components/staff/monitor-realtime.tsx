"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ClassificationRow, ContainerRow, DeviceRow } from "@/lib/db-types";
import {
  CATEGORY_LABELS,
  CONTAINER_LEVEL_LABELS,
  CONTAINER_LEVEL_VARIANTS,
  DEVICE_STATUS_LABELS,
  DEVICE_STATUS_VARIANTS,
  effectiveDeviceStatus,
  formatConfidence,
  formatDateTime,
  formatPercent,
  formatRelative,
} from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ConnStatus = "connecting" | "live" | "reconnecting" | "offline";

const STATUS_META: Record<ConnStatus, { label: string; className: string }> = {
  connecting: { label: "Conectando...", className: "bg-amber-500/15 text-amber-600" },
  live: { label: "En vivo", className: "bg-emerald-500/15 text-emerald-600" },
  reconnecting: { label: "Reconectando...", className: "bg-amber-500/15 text-amber-600" },
  offline: { label: "Sin conexion", className: "bg-destructive/15 text-destructive" },
};

export function MonitorRealtime({
  initialDevices,
  initialContainers,
  initialClassifications,
}: {
  initialDevices: DeviceRow[];
  initialContainers: ContainerRow[];
  initialClassifications: ClassificationRow[];
}) {
  const [devices, setDevices] = useState(initialDevices);
  const [containers, setContainers] = useState(initialContainers);
  const [feed, setFeed] = useState(initialClassifications);
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const upsertDevice = (row: DeviceRow) =>
      setDevices((prev) => {
        const idx = prev.findIndex((d) => d.id === row.id);
        if (idx === -1) return [...prev, row];
        const next = [...prev];
        next[idx] = { ...next[idx], ...row };
        return next;
      });

    const upsertContainer = (row: ContainerRow) =>
      setContainers((prev) => {
        const idx = prev.findIndex((c) => c.id === row.id);
        if (idx === -1) return [...prev, row];
        const next = [...prev];
        next[idx] = { ...next[idx], ...row };
        return next;
      });

    const channel = supabase
      .channel("monitor-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "classifications" },
        (payload) => {
          setFeed((prev) => [payload.new as ClassificationRow, ...prev].slice(0, 20));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "devices" },
        (payload) => upsertDevice(payload.new as DeviceRow),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "containers" },
        (payload) => upsertContainer(payload.new as ContainerRow),
      )
      .subscribe((channelStatus) => {
        if (channelStatus === "SUBSCRIBED") setStatus("live");
        else if (channelStatus === "CHANNEL_ERROR" || channelStatus === "TIMED_OUT")
          setStatus("reconnecting");
        else if (channelStatus === "CLOSED") setStatus("offline");
      });

    channelRef.current = channel;

    const handleOffline = () => setStatus("offline");
    const handleOnline = () => setStatus("reconnecting");
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      supabase.removeChannel(channel);
    };
  }, []);

  const meta = STATUS_META[status];
  const StatusIcon = status === "live" ? Wifi : status === "offline" ? WifiOff : RefreshCw;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Monitor en vivo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Estado de dispositivos y clasificaciones en tiempo real.
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium",
            meta.className,
          )}
        >
          <StatusIcon className={cn("h-4 w-4", status !== "live" && "animate-spin")} />
          {meta.label}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dispositivos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin dispositivos.</p>
            ) : (
              devices.map((device) => {
                const status = effectiveDeviceStatus(device.status, device.last_seen_at);
                return (
                  <div
                    key={device.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{device.name ?? device.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {device.code} - visto {formatRelative(device.last_seen_at)}
                      </p>
                    </div>
                    <Badge variant={DEVICE_STATUS_VARIANTS[status]}>
                      {DEVICE_STATUS_LABELS[status]}
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contenedores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {containers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin contenedores.</p>
            ) : (
              containers.map((container) => (
                <div key={container.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{CATEGORY_LABELS[container.category]}</span>
                    <Badge variant={CONTAINER_LEVEL_VARIANTS[container.level]}>
                      {CONTAINER_LEVEL_LABELS[container.level]}
                    </Badge>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${container.fill_percent}%` }}
                    />
                  </div>
                  <p className="text-right text-xs text-muted-foreground">
                    {formatPercent(container.fill_percent)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Flujo de clasificaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {feed.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Esperando clasificaciones en tiempo real...
            </p>
          ) : (
            feed.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0"
              >
                <span className="flex items-center gap-2">
                  <Badge variant="outline">{CATEGORY_LABELS[c.category]}</Badge>
                  <span className="text-muted-foreground">
                    confianza {formatConfidence(c.confidence)}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">{formatDateTime(c.created_at)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

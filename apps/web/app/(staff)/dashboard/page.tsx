import { Recycle, Target, Route, Cpu, Award, TriangleAlert } from "lucide-react";
import { WASTE_CATEGORIES } from "@ecosort/shared";
import { requireRole } from "@/lib/auth/session";
import { ROLE_ACCESS } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CONTAINER_LEVEL_LABELS,
  CONTAINER_LEVEL_VARIANTS,
  effectiveDeviceStatus,
  formatConfidence,
  formatDateTime,
  formatPercent,
} from "@/lib/format";
import type { ClassificationRow, ContainerRow, DeviceRow, RoutingEventRow } from "@/lib/db-types";
import { PageHeader } from "@/components/staff/page-header";
import { StatCard } from "@/components/staff/stat-card";
import {
  CategoryPieChart,
  ClassificationsBarChart,
  type CategorySlice,
  type DayPoint,
} from "@/components/staff/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

function lastSevenDays(classifications: ClassificationRow[]): DayPoint[] {
  const days: DayPoint[] = [];
  const counts = new Map<string, number>();
  for (const c of classifications) {
    const key = new Date(c.created_at).toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ label: DAY_LABELS[d.getDay()], total: counts.get(key) ?? 0 });
  }
  return days;
}

export default async function DashboardPage() {
  await requireRole(ROLE_ACCESS["/dashboard"]);
  const supabase = await createClient();

  const [classificationsRes, routingRes, devicesRes, containersRes] = await Promise.all([
    supabase
      .from("classifications")
      .select("id, device_id, user_id, category, confidence, eco_points_awarded, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("routing_events").select("id, category, success, created_at"),
    supabase.from("devices").select("id, code, name, status, last_seen_at"),
    supabase.from("containers").select("id, device_id, category, level, fill_percent, updated_at"),
  ]);

  const classifications = (classificationsRes.data ?? []) as ClassificationRow[];
  const routing = (routingRes.data ?? []) as Pick<RoutingEventRow, "success">[];
  const devices = (devicesRes.data ?? []) as Pick<DeviceRow, "status" | "last_seen_at">[];
  const containers = (containersRes.data ?? []) as ContainerRow[];

  const totalClassifications = classifications.length;
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayCount = classifications.filter(
    (c) => new Date(c.created_at).toISOString().slice(0, 10) === todayKey,
  ).length;

  const confidences = classifications.map((c) => c.confidence ?? 0).filter((v) => v > 0);
  const avgConfidence =
    confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;

  const routingTotal = routing.length;
  const routingOk = routing.filter((r) => r.success).length;
  const routingRate = routingTotal > 0 ? (routingOk / routingTotal) * 100 : 0;

  const onlineDevices = devices.filter(
    (d) => effectiveDeviceStatus(d.status, d.last_seen_at) === "online",
  ).length;
  const ecoPointsTotal = classifications.reduce((acc, c) => acc + (c.eco_points_awarded ?? 0), 0);
  const containersFull = containers.filter((c) => c.level === "full").length;

  const perDay = lastSevenDays(classifications);
  const categorySlices: CategorySlice[] = WASTE_CATEGORIES.map((cat) => ({
    name: CATEGORY_LABELS[cat],
    value: classifications.filter((c) => c.category === cat).length,
    color: CATEGORY_COLORS[cat],
  }));

  const recent = classifications.slice(0, 8);

  return (
    <div>
      <PageHeader
        title="Resumen"
        description="Vision general de la actividad de clasificacion y el estado del sistema."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Clasificaciones" value={totalClassifications} icon={Recycle} />
        <StatCard label="Hoy" value={todayCount} icon={Target} hint="Ultimas 24 h del dia" />
        <StatCard
          label="Confianza media"
          value={formatConfidence(avgConfidence)}
          icon={Target}
        />
        <StatCard
          label="Exito de ruteo"
          value={formatPercent(routingRate)}
          icon={Route}
          hint={`${routingOk}/${routingTotal} eventos`}
        />
        <StatCard
          label="Dispositivos en linea"
          value={`${onlineDevices}/${devices.length}`}
          icon={Cpu}
        />
        <StatCard label="EcoPuntos otorgados" value={ecoPointsTotal} icon={Award} />
      </div>

      {containersFull > 0 ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {containersFull} contenedor(es) al maximo de capacidad requieren vaciado.
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Clasificaciones (ultimos 7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ClassificationsBarChart data={perDay} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={categorySlices} />
            <ul className="mt-4 space-y-2">
              {categorySlices.map((slice) => (
                <li key={slice.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: slice.color }}
                    />
                    {slice.name}
                  </span>
                  <span className="font-medium">{slice.value}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {recent.length === 0 ? (
              <p className="px-6 text-sm text-muted-foreground">Aun no hay clasificaciones.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Categoria</TableHead>
                    <TableHead>Confianza</TableHead>
                    <TableHead>EcoPuntos</TableHead>
                    <TableHead className="pr-6">Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="pl-6">
                        <Badge variant="outline">{CATEGORY_LABELS[c.category]}</Badge>
                      </TableCell>
                      <TableCell>{formatConfidence(c.confidence)}</TableCell>
                      <TableCell>{c.eco_points_awarded}</TableCell>
                      <TableCell className="pr-6 text-muted-foreground">
                        {formatDateTime(c.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contenedores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {containers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin contenedores registrados.</p>
            ) : (
              containers
                .sort((a, b) => b.fill_percent - a.fill_percent)
                .map((container) => (
                  <div key={container.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{CATEGORY_LABELS[container.category]}</span>
                      <Badge variant={CONTAINER_LEVEL_VARIANTS[container.level]}>
                        {CONTAINER_LEVEL_LABELS[container.level]}
                      </Badge>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
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
    </div>
  );
}

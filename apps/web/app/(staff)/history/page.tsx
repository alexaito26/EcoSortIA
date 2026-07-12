import Link from "next/link";
import { WASTE_CATEGORIES, type WasteCategory } from "@ecosort/shared";
import { requireRole } from "@/lib/auth/session";
import { ROLE_ACCESS } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABELS, formatConfidence, formatDateTime } from "@/lib/format";
import type { ClassificationRow, RoutingEventRow } from "@/lib/db-types";
import { PageHeader } from "@/components/staff/page-header";
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
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function isCategory(value: string | undefined): value is WasteCategory {
  return !!value && (WASTE_CATEGORIES as readonly string[]).includes(value);
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  await requireRole(ROLE_ACCESS["/history"]);
  const supabase = await createClient();
  const { category } = await searchParams;
  const activeCategory = isCategory(category) ? category : undefined;

  let query = supabase
    .from("classifications")
    .select("id, device_id, user_id, category, confidence, eco_points_awarded, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (activeCategory) query = query.eq("category", activeCategory);

  const [classificationsRes, routingRes] = await Promise.all([
    query,
    supabase
      .from("routing_events")
      .select("id, category, success, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const classifications = (classificationsRes.data ?? []) as ClassificationRow[];
  const routing = (routingRes.data ?? []) as RoutingEventRow[];

  const chip = (href: string, label: string, active: boolean) => (
    <Link
      key={label}
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </Link>
  );

  return (
    <div>
      <PageHeader
        title="Historial"
        description="Registro de clasificaciones y eventos de ruteo del sistema."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {chip("/history", "Todas", !activeCategory)}
        {WASTE_CATEGORIES.map((cat) =>
          chip(`/history?category=${cat}`, CATEGORY_LABELS[cat], activeCategory === cat),
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Clasificaciones{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({classifications.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {classifications.length === 0 ? (
              <p className="px-6 text-sm text-muted-foreground">Sin resultados.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Categoria</TableHead>
                    <TableHead>Confianza</TableHead>
                    <TableHead>EcoPuntos</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead className="pr-6">Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classifications.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="pl-6">
                        <Badge variant="outline">{CATEGORY_LABELS[c.category]}</Badge>
                      </TableCell>
                      <TableCell>{formatConfidence(c.confidence)}</TableCell>
                      <TableCell>{c.eco_points_awarded}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.user_id ? "Atribuida" : "Anonima"}
                      </TableCell>
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
            <CardTitle className="text-base">Ruteos recientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {routing.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin eventos de ruteo.</p>
            ) : (
              routing.map((r) => (
                <div key={r.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{CATEGORY_LABELS[r.category]}</Badge>
                    <Badge variant={r.success ? "success" : "destructive"}>
                      {r.success ? "Exito" : "Fallo"}
                    </Badge>
                  </div>
                  {r.error_message ? (
                    <p className="mt-2 text-xs text-destructive">{r.error_message}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDateTime(r.created_at)}
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

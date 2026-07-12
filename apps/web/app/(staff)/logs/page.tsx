import Link from "next/link";
import { LOG_LEVELS, type LogLevel } from "@ecosort/shared";
import { requireRole } from "@/lib/auth/session";
import { ROLE_ACCESS } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import {
  LOG_LEVEL_LABELS,
  LOG_LEVEL_VARIANTS,
  LOG_SOURCE_LABELS,
  formatDateTime,
} from "@/lib/format";
import type { SystemLogRow } from "@/lib/db-types";
import { PageHeader } from "@/components/staff/page-header";
import { Card, CardContent } from "@/components/ui/card";
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

function isLevel(value: string | undefined): value is LogLevel {
  return !!value && (LOG_LEVELS as readonly string[]).includes(value);
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  await requireRole(ROLE_ACCESS["/logs"]);
  const supabase = await createClient();
  const { level } = await searchParams;
  const activeLevel = isLevel(level) ? level : undefined;

  let query = supabase
    .from("system_logs")
    .select("id, device_id, level, source, message, context, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (activeLevel) query = query.eq("level", activeLevel);

  const logs = ((await query).data ?? []) as SystemLogRow[];

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
        title="Logs del sistema"
        description="Eventos internos de dispositivos y comunicaciones (solo administradores)."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {chip("/logs", "Todos", !activeLevel)}
        {LOG_LEVELS.map((lvl) => chip(`/logs?level=${lvl}`, LOG_LEVEL_LABELS[lvl], activeLevel === lvl))}
      </div>

      <Card>
        <CardContent className="px-0">
          {logs.length === 0 ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">Sin registros.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Nivel</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Mensaje</TableHead>
                  <TableHead className="pr-6">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="pl-6">
                      <Badge variant={LOG_LEVEL_VARIANTS[log.level]}>
                        {LOG_LEVEL_LABELS[log.level]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {LOG_SOURCE_LABELS[log.source]}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <span className="block truncate">{log.message}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap pr-6 text-muted-foreground">
                      {formatDateTime(log.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

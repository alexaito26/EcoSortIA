import { requireRole } from "@/lib/auth/session";
import { ROLE_ACCESS } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, ROLE_VARIANTS, formatDate } from "@/lib/format";
import type { ProfileRow } from "@/lib/db-types";
import { PageHeader } from "@/components/staff/page-header";
import { RoleSelect } from "@/components/staff/role-select";
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

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const admin = await requireRole(ROLE_ACCESS["/users"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, eco_points, created_at")
    .order("created_at", { ascending: true });

  const profiles = (data ?? []) as ProfileRow[];

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Gestiona las cuentas y sus roles. Solo los administradores pueden cambiar roles."
      />

      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>EcoPuntos</TableHead>
                <TableHead>Registrado</TableHead>
                <TableHead className="pr-6">Cambiar rol</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="pl-6">
                    <p className="font-medium">{profile.full_name ?? "Sin nombre"}</p>
                    <p className="text-xs text-muted-foreground">{profile.email}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ROLE_VARIANTS[profile.role]}>
                      {ROLE_LABELS[profile.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>{profile.eco_points}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(profile.created_at)}
                  </TableCell>
                  <TableCell className="pr-6">
                    <RoleSelect
                      userId={profile.id}
                      currentRole={profile.role}
                      disabled={profile.id === admin.id}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

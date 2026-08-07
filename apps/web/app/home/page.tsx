import { requireRole } from "@/lib/auth/session";
import { ROLE_ACCESS } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/logout-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ClassificationRef = { category: string } | { category: string }[] | null;
type LedgerEntry = {
  id: string;
  points: number;
  reason: string | null;
  created_at: string;
  classifications: ClassificationRef;
};

const labels: Record<string, string> = {
  plastic: "plastico",
  glass: "vidrio",
  reject: "rechazo",
  unknown: "no identificado",
};

function categoryOf(value: ClassificationRef): string {
  if (Array.isArray(value)) return value[0]?.category ?? "unknown";
  return value?.category ?? "unknown";
}

export default async function HomePage() {
  const profile = await requireRole(ROLE_ACCESS["/home"]);
  const supabase = await createClient();
  const [ledgerResult, countResult] = await Promise.all([
    supabase
      .from("eco_points_ledger")
      .select("id, points, reason, created_at, classifications(category)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("eco_points_ledger")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id),
  ]);
  const entries = (ledgerResult.data ?? []) as unknown as LedgerEntry[];
  const claimedCount = countResult.count ?? 0;

  return (
    <main className="mx-auto w-full max-w-md space-y-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Hola, {profile.full_name ?? "usuario"}</h1>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
        <LogoutButton />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>EcoPuntos disponibles</CardTitle>
          <CardDescription>Saldo acreditado mediante reclamos de QR</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{profile.eco_points}</p>
          <p className="text-sm text-muted-foreground">
            Reciclajes reclamados: {claimedCount}
          </p>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Historial reciente</h2>
        {entries.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              Aun no has reclamado EcoPuntos.
            </CardContent>
          </Card>
        ) : (
          entries.map((entry) => {
            const category = categoryOf(entry.classifications);
            return (
              <Card key={entry.id}>
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium">Residuo: {labels[category] ?? category}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("es-EC", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(entry.created_at))}
                    </p>
                  </div>
                  <p className="font-semibold text-emerald-600">+{entry.points}</p>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>
    </main>
  );
}

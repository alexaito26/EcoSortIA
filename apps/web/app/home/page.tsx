import { requireRole } from "@/lib/auth/session";
import { ROLE_ACCESS } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/logout-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassWater, Leaf, PackageCheck, Recycle, Sparkles } from "lucide-react";

type ClassificationRef = { category: string } | { category: string }[] | null;
type LedgerEntry = {
  id: string;
  points: number;
  reason: string | null;
  created_at: string;
  classifications: ClassificationRef;
};

const labels: Record<string, string> = {
  plastic: "plástico",
  glass: "vidrio",
  reject: "rechazo",
  unknown: "no identificado",
};

const categoryStyles: Record<string, { icon: typeof Recycle; color: string; bg: string }> = {
  plastic: { icon: PackageCheck, color: "text-sky-600", bg: "bg-sky-100" },
  glass: { icon: GlassWater, color: "text-violet-600", bg: "bg-violet-100" },
  reject: { icon: Recycle, color: "text-amber-600", bg: "bg-amber-100" },
  unknown: { icon: Recycle, color: "text-slate-500", bg: "bg-slate-100" },
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
    <main className="min-h-[100dvh] bg-gradient-to-b from-emerald-50 via-white to-lime-50 px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-md space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
              <Leaf className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">EcoSort AI</p>
              <h1 className="text-lg font-bold">Hola, {profile.full_name ?? "usuario"}</h1>
            </div>
          </div>
          <LogoutButton />
        </header>

        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-700 via-emerald-600 to-lime-500 p-6 text-white shadow-xl shadow-emerald-700/20">
          <Sparkles className="absolute -right-3 -top-3 h-28 w-28 text-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-emerald-50">Tu saldo disponible</p>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">EcoPuntos</span>
            </div>
            <p className="mt-5 text-6xl font-black tracking-tight">{profile.eco_points}</p>
            <p className="mt-1 text-sm text-emerald-50">Puntos acumulados por reciclar</p>
            <div className="mt-6 flex items-center gap-2 text-xs text-white/85">
              <Recycle className="h-4 w-4" />
              <span>Cada reclamo válido suma a tu cuenta</span>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Card className="rounded-2xl border-emerald-100 bg-white/80 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Reciclajes reclamados</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{claimedCount}</p>
              <p className="mt-1 text-xs text-emerald-700">Buen trabajo</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-lime-100 bg-white/80 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Impacto</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{claimedCount * 1}</p>
              <p className="mt-1 text-xs text-lime-700">acciones sostenibles</p>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-2xl border border-emerald-100 bg-white/75 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">¿Cómo ganas puntos?</h2>
              <p className="text-sm text-muted-foreground">Escanea el QR que aparece en la pantalla después de clasificar tu residuo.</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Actividad</p>
              <h2 className="text-xl font-bold">Historial reciente</h2>
            </div>
            {entries.length > 0 && <span className="text-xs text-muted-foreground">Últimos {entries.length}</span>}
          </div>
          {entries.length === 0 ? (
            <Card className="rounded-2xl border-dashed border-emerald-200 bg-white/70">
              <CardContent className="flex flex-col items-center gap-3 py-9 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Recycle className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-semibold">Tu historia empieza aquí</p>
                  <p className="mt-1 text-sm text-muted-foreground">Aún no has reclamado EcoPuntos.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            entries.map((entry) => {
              const category = categoryOf(entry.classifications);
              const style = categoryStyles[category] ?? categoryStyles.unknown;
              const Icon = style.icon;
              return (
                <Card key={entry.id} className="rounded-2xl border-emerald-100 bg-white/85 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.bg} ${style.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold capitalize">{labels[category] ?? category}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Intl.DateTimeFormat("es-EC", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.created_at))}
                        </p>
                      </div>
                    </div>
                    <p className="shrink-0 text-lg font-bold text-emerald-600">+{entry.points}</p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}

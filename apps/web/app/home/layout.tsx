import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/session";
import { ROLE_ACCESS } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/logout-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
type LedgerRow = { id: string; points: number; created_at: string; classifications: { category: string; devices: { code: string; name: string | null } | null } | null };
const labels: Record<string, string> = { plastic: "plástico", glass: "vidrio", reject: "rechazo", unknown: "residuo no identificado" };
export default async function HomeLayout({ children }: { children: ReactNode }) {
  void children; const profile = await requireRole(ROLE_ACCESS["/home"]); const supabase = await createClient();
  const { data } = await supabase.from("eco_points_ledger").select("id, points, created_at, classifications(category, devices(code, name))").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(10);
  const entries = (data ?? []) as unknown as LedgerRow[];
  return <main className="mx-auto w-full max-w-md space-y-6 px-4 py-8"><header className="flex items-center justify-between"><div><h1 className="text-xl font-bold">Hola, {profile.full_name ?? "usuario"}</h1><p className="text-sm text-muted-foreground">{profile.email}</p></div><LogoutButton /></header><Card><CardHeader><CardTitle>Tus EcoPuntos</CardTitle><CardDescription>Saldo disponible</CardDescription></CardHeader><CardContent><p className="text-4xl font-bold">{profile.eco_points}</p><p className="text-sm text-muted-foreground">Los puntos se acreditan al reclamar el QR.</p></CardContent></Card><section className="space-y-3"><h2 className="text-lg font-semibold">Actividad reciente</h2>{entries.length === 0 ? <Card><CardContent className="py-6 text-sm text-muted-foreground">Aún no has reclamado EcoPuntos.</CardContent></Card> : entries.map((entry) => { const category = entry.classifications?.category ?? "unknown", device = entry.classifications?.devices; return <Card key={entry.id}><CardContent className="flex items-center justify-between py-4"><div><p className="font-medium">Reciclaste {labels[category] ?? category}</p><p className="text-sm text-muted-foreground">{device?.name ?? "EcoSort AI"}{device?.code ? ` - ${device.code}` : ""}</p><p className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("es-EC", { dateStyle: "short", timeStyle: "short" }).format(new Date(entry.created_at))}</p></div><p className="font-semibold text-emerald-600">+{entry.points} EcoPuntos</p></CardContent></Card>; })}</section></main>;
}

"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
type Result = { success: boolean; points?: number; category?: string; message?: string; error?: string };
export function ClaimClient() {
  const search = useSearchParams(), router = useRouter(), token = search.get("token") ?? "";
  const [result, setResult] = useState<Result | null>(null), [loading, setLoading] = useState(true);
  useEffect(() => { let alive = true; async function claim() {
    if (!token) { if (alive) { setResult({ success: false, error: "QR inválido." }); setLoading(false); } return; }
    const supabase = createClient(); const { data: { session } } = await supabase.auth.getSession();
    if (!session) { sessionStorage.setItem("ecosort_claim_token", token); router.replace(`/claim-login?token=${encodeURIComponent(token)}`); return; }
    const { data, error } = await supabase.functions.invoke<Result>("claim-eco-points", { body: { token } });
    if (alive) { setResult(data ?? { success: false, error: error?.message ?? "No se pudo reclamar." }); setLoading(false); }
  } void claim(); return () => { alive = false; }; }, [router, token]);
  if (loading) return <main className="mx-auto max-w-md px-4 py-12"><Card><CardContent className="py-8 text-center">Validando tu QR…</CardContent></Card></main>;
  if (result?.success) { const material = result.category === "glass" ? "vidrio" : "plástico"; return <main className="mx-auto max-w-md px-4 py-12"><Card><CardHeader><CardTitle>¡EcoPuntos reclamados!</CardTitle><CardDescription>Ganaste {result.points} EcoPuntos por reciclar {material}.</CardDescription></CardHeader><CardContent className="flex gap-3"><Link className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" href="/home">Ver mis EcoPuntos</Link><Link className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium" href="/home">Ir al inicio</Link></CardContent></Card></main>; }
  return <main className="mx-auto max-w-md px-4 py-12"><Card><CardHeader><CardTitle>No se pudo reclamar</CardTitle><CardDescription>{result?.error ?? "No se pudo reclamar el QR."}</CardDescription></CardHeader><CardContent><Button onClick={() => router.push("/home")}>Ir al inicio</Button></CardContent></Card></main>;
}

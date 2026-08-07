"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ClaimLoginPage() {
  const search = useSearchParams(); const router = useRouter(); const token = search.get("token") ?? "";
  const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  async function submit(form: FormData) {
    setLoading(true); setError(null);
    const { error: signInError } = await createClient().auth.signInWithPassword({ email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") });
    if (signInError) { setError("Correo o contraseña incorrectos."); setLoading(false); return; }
    sessionStorage.removeItem("ecosort_claim_token"); router.replace(`/claim?token=${encodeURIComponent(token)}`);
  }
  return <main className="mx-auto max-w-md px-4 py-12"><Card><CardHeader><CardTitle>Inicia sesión para reclamar</CardTitle><CardDescription>Tus EcoPuntos se acreditarán solo en tu cuenta.</CardDescription></CardHeader><CardContent><form action={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="email">Correo electrónico</Label><Input id="email" name="email" type="email" required /></div><div className="space-y-2"><Label htmlFor="password">Contraseña</Label><Input id="password" name="password" type="password" required /></div>{error && <p className="text-sm text-destructive">{error}</p>}<Button className="w-full" disabled={loading}>{loading ? "Ingresando…" : "Ingresar y reclamar"}</Button></form><p className="mt-4 text-sm text-muted-foreground">¿No tienes cuenta? <Link href="/register" className="underline">Regístrate</Link></p></CardContent></Card></main>;
}

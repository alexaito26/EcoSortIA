"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, KeyRound, Leaf, Loader2, QrCode } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ClaimLoginClient() {
  const search = useSearchParams();
  const router = useRouter();
  const token = search.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(form: FormData) {
    setLoading(true);
    setError(null);
    const { error: signInError } = await createClient().auth.signInWithPassword({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    if (signInError) {
      setError("Correo o contraseña incorrectos.");
      setLoading(false);
      return;
    }
    sessionStorage.removeItem("ecosort_claim_token");
    router.replace(`/claim?token=${encodeURIComponent(token)}`);
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-lime-50 px-4 py-8">
      <Card className="w-full max-w-md rounded-[2rem] border-emerald-100 shadow-xl shadow-emerald-100/50">
        <div className="h-2 bg-gradient-to-r from-emerald-500 to-lime-400" />
        <CardHeader className="items-center pt-10 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <QrCode className="h-10 w-10" />
          </div>
          <CardTitle className="mt-5 text-2xl">Reclama tus EcoPuntos</CardTitle>
          <CardDescription className="mt-1 max-w-xs text-base">
            Inicia sesión para acreditar este reciclaje en tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-9">
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
              <Leaf className="h-4 w-4" />
            </div>
            <span>Tu QR es único y solo puede reclamarse una vez.</span>
          </div>
          <form action={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input className="h-12 rounded-xl" id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="h-12 rounded-xl pl-10" id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
            </div>
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <Button className="h-12 w-full rounded-xl bg-emerald-600 font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700" disabled={loading} aria-busy={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Ingresando...</> : <>Ingresar y reclamar <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="font-semibold text-emerald-700 underline underline-offset-4">
              Regístrate
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

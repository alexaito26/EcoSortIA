"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <Card className="w-full max-w-md rounded-3xl border-emerald-100 shadow-xl shadow-emerald-100/50">
        <div className="h-2 bg-gradient-to-r from-emerald-500 to-lime-400" />
        <CardHeader className="pt-9 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-3xl">
            ♻️
          </div>
          <CardTitle className="mt-4 text-2xl">Reclama tus EcoPuntos</CardTitle>
          <CardDescription className="text-base">
            Inicia sesión para acreditar el reciclaje en tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <form action={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input className="h-11 rounded-xl" id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input className="h-11 rounded-xl" id="password" name="password" type="password" required />
            </div>
            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <Button className="h-11 w-full rounded-xl bg-emerald-600 font-semibold text-white hover:bg-emerald-700" disabled={loading}>
              {loading ? "Ingresando…" : "Ingresar y reclamar"}
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

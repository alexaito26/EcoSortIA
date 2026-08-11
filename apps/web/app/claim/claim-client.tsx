"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Result = {
  success: boolean;
  points?: number;
  category?: string;
  message?: string;
  error?: string;
};

const errorMessages: Record<string, string> = {
  QR_INVALID: "El QR no es valido.",
  QR_EXPIRED: "El QR expiro.",
  QR_ALREADY_CLAIMED: "Los puntos de este QR ya fueron reclamados.",
  QR_UNAVAILABLE: "Este QR ya no esta disponible.",
  QR_NOT_ACCEPTED: "Este residuo no genera EcoPuntos.",
  UNAUTHORIZED: "Inicia sesion para reclamar tus puntos.",
};

function readableError(value: string | undefined): string {
  if (!value) return "No se pudo reclamar el QR.";
  return errorMessages[value] ?? value;
}

export function ClaimClient() {
  const search = useSearchParams();
  const router = useRouter();
  const token = search.get("token") ?? "";
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function claim() {
      if (!token) {
        if (alive) {
          setResult({ success: false, error: "QR_INVALID" });
          setLoading(false);
        }
        return;
      }

      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        sessionStorage.setItem("ecosort_claim_token", token);
        router.replace("/claim-login?token=" + encodeURIComponent(token));
        return;
      }

      const { data, error } = await supabase.functions.invoke<Result>(
        "claim-eco-points",
        { body: { token } },
      );
      if (!alive) return;
      setResult(
        data ?? {
          success: false,
          error: readableError(error?.message),
        },
      );
      setLoading(false);
    }
    void claim();
    return () => {
      alive = false;
    };
  }, [router, token]);

  if (loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-lime-50 px-4 py-8">
        <Card className="w-full max-w-md rounded-3xl border-emerald-100 shadow-xl shadow-emerald-100/50">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
              ♻️
            </div>
            <div>
              <p className="text-lg font-semibold">EcoSort AI</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Validando tu QR...
              </p>
            </div>
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-emerald-100">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (result?.success) {
    const material = result.category === "glass" ? "vidrio" : "plastico";
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-lime-50 px-4 py-8">
        <Card className="w-full max-w-md overflow-hidden rounded-3xl border-emerald-100 shadow-xl shadow-emerald-100/50">
          <div className="h-2 bg-gradient-to-r from-emerald-500 to-lime-400" />
          <CardHeader className="items-center pb-3 pt-9 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl">
              ✓
            </div>
            <CardTitle className="mt-3 text-2xl">¡Reclamo exitoso!</CardTitle>
            <CardDescription>
              Tus EcoPuntos ya están en tu cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pb-8 text-center">
            <div className="rounded-2xl bg-emerald-50 px-5 py-4">
              <p className="text-4xl font-bold text-emerald-700">+{result.points ?? 0}</p>
              <p className="mt-1 text-sm text-emerald-800/70">
                EcoPuntos por reciclar {material}
              </p>
            </div>
            <Link
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
              href="/home"
            >
              Ver mi cuenta
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-amber-50 via-white to-rose-50 px-4 py-8">
      <Card className="w-full max-w-md rounded-3xl border-amber-100 shadow-xl shadow-amber-100/40">
        <CardHeader className="items-center pt-9 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl">
            !
          </div>
          <CardTitle className="mt-3 text-2xl">No se pudo reclamar</CardTitle>
          <CardDescription className="text-base">
            {result?.message ?? readableError(result?.error)}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <Button className="h-11 w-full rounded-xl" onClick={() => router.push("/home")}>
            Ir al inicio
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

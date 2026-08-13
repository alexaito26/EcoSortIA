"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Home, Loader2, Recycle, Sparkles } from "lucide-react";
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
  QR_INVALID: "El QR no es válido.",
  QR_EXPIRED: "El QR expiró.",
  QR_ALREADY_CLAIMED: "Los puntos de este QR ya fueron reclamados.",
  QR_UNAVAILABLE: "Este QR ya no está disponible.",
  QR_NOT_ACCEPTED: "Este residuo no genera EcoPuntos.",
  UNAUTHORIZED: "Inicia sesión para reclamar tus puntos.",
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
      setResult(data ?? { success: false, error: readableError(error?.message) });
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
        <Card className="w-full max-w-md rounded-[2rem] border-emerald-100 shadow-xl shadow-emerald-100/50">
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <Recycle className="h-10 w-10 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold">EcoSort AI</p>
              <p className="mt-1 text-sm text-muted-foreground">Validando tu QR...</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Un momento, estamos verificando tu reciclaje</span>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (result?.success) {
    const material = result.category === "glass" ? "vidrio" : "plástico";
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-lime-50 px-4 py-8">
        <Card className="w-full max-w-md overflow-hidden rounded-[2rem] border-emerald-100 shadow-xl shadow-emerald-100/50">
          <div className="h-2 bg-gradient-to-r from-emerald-500 to-lime-400" />
          <CardHeader className="items-center pb-3 pt-10 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50">
              <CheckCircle2 className="h-14 w-14" />
            </div>
            <CardTitle className="mt-5 text-3xl">¡Reclamo exitoso!</CardTitle>
            <CardDescription className="mt-1 text-base">Los puntos ya están en tu cuenta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pb-9 text-center">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-lime-500 px-5 py-6 text-white shadow-lg shadow-emerald-600/20">
              <Sparkles className="absolute -right-2 -top-3 h-20 w-20 text-white/20" />
              <p className="relative text-6xl font-black tracking-tight">+{result.points ?? 0}</p>
              <p className="relative mt-1 text-sm text-white/90">EcoPuntos por reciclar {material}</p>
            </div>
            <Link className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700" href="/home">
              Ver mi cuenta <Home className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-amber-50 via-white to-rose-50 px-4 py-8">
      <Card className="w-full max-w-md rounded-[2rem] border-amber-100 shadow-xl shadow-amber-100/40">
        <CardHeader className="items-center pt-10 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <AlertTriangle className="h-10 w-10" />
          </div>
          <CardTitle className="mt-4 text-2xl">No se pudo reclamar</CardTitle>
          <CardDescription className="text-base">{result?.message ?? readableError(result?.error)}</CardDescription>
        </CardHeader>
        <CardContent className="pb-9">
          <Button className="h-12 w-full rounded-xl" onClick={() => router.push("/home")}>
            Ir al inicio
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

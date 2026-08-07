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
      <main className="mx-auto max-w-md px-4 py-12">
        <Card>
          <CardContent className="py-8 text-center">
            Validando tu QR...
          </CardContent>
        </Card>
      </main>
    );
  }

  if (result?.success) {
    const material = result.category === "glass" ? "vidrio" : "plastico";
    return (
      <main className="mx-auto max-w-md px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>EcoPuntos reclamados</CardTitle>
            <CardDescription>
              Ganaste {result.points ?? 0} EcoPuntos por reciclar {material}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Link
              className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              href="/home"
            >
              Ver mis EcoPuntos
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>No se pudo reclamar</CardTitle>
          <CardDescription>
            {result?.message ?? readableError(result?.error)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push("/home")}>Ir al inicio</Button>
        </CardContent>
      </Card>
    </main>
  );
}

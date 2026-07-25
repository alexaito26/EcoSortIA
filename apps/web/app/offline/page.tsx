import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RetryButton } from "@/components/pwa/retry-button";

export const metadata: Metadata = {
  title: "Sin conexion - EcoSort AI",
};

/**
 * Pagina de respaldo que el service worker sirve cuando una navegacion falla
 * por falta de red. Es estatica a proposito: no consulta Supabase ni muestra
 * datos del usuario, porque debe poder precachearse sin filtrar informacion.
 */
export default function OfflinePage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <WifiOff className="h-7 w-7 text-muted-foreground" />
          </div>
          <CardTitle className="mt-4">Sin conexion</CardTitle>
          <CardDescription>
            No pudimos cargar esta pagina porque el dispositivo esta sin internet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tus datos siguen seguros en el servidor. En cuanto vuelva la conexion, el monitor y el
            historial se actualizaran automaticamente.
          </p>
          <RetryButton />
        </CardContent>
      </Card>
    </main>
  );
}

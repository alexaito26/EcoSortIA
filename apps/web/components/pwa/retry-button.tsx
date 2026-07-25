"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Reintenta la navegacion desde la pagina offline y refleja el estado de red. */
export function RetryButton() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <div className="space-y-2">
      <Button className="w-full" onClick={() => window.location.reload()}>
        <RefreshCw className="h-4 w-4" />
        Reintentar
      </Button>
      <p className="text-xs text-muted-foreground">
        {online ? "Conexion detectada. Vuelve a intentarlo." : "Esperando conexion..."}
      </p>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SERVICE_WORKER_PATH } from "@/lib/pwa/constants";

/**
 * Registra el service worker y avisa cuando hay una version nueva esperando.
 *
 * Flujo de actualizacion:
 *  1. El navegador descarga el sw.js nuevo y lo deja en estado "waiting".
 *  2. Mostramos el aviso con el boton "Actualizar".
 *  3. Al pulsarlo enviamos SKIP_WAITING y recargamos cuando cambia el
 *     controlador, de modo que el usuario nunca queda con mitad vieja
 *     y mitad nueva.
 *
 * En desarrollo no se registra: los chunks de Next no son inmutables y el
 * cache generaria codigo obsoleto. Para probar la PWA usa un build de
 * produccion (ver docs/pwa.md).
 */
export function ServiceWorkerRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const reloadingRef = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | undefined;

    const onControllerChange = () => {
      if (reloadingRef.current) return;
      reloadingRef.current = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH, {
          scope: "/",
        });

        if (registration.waiting) setWaitingWorker(registration.waiting);

        registration.addEventListener("updatefound", () => {
          const installing = registration?.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            // Solo es "actualizacion" si ya habia un SW controlando la pagina.
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              setWaitingWorker(installing);
            }
          });
        });
      } catch {
        // Un fallo al registrar no debe romper la app: seguira funcionando online.
      }
    };

    void register();

    // Busca versiones nuevas al volver a la pestana.
    const onVisibility = () => {
      if (document.visibilityState === "visible") void registration?.update();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    waitingWorker?.postMessage({ type: "SKIP_WAITING" });
    setWaitingWorker(null);
  }, [waitingWorker]);

  if (!waitingWorker) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto mb-[calc(env(safe-area-inset-bottom)+1rem)] flex w-[calc(100%-2rem)] max-w-sm items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-lg"
    >
      <RefreshCw className="h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Nueva version disponible</p>
        <p className="text-xs text-muted-foreground">Actualiza para obtener los ultimos cambios.</p>
      </div>
      <Button size="sm" onClick={applyUpdate}>
        Actualizar
      </Button>
    </div>
  );
}

"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

function subscribeToNetwork(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * Franja global de estado de red. Solo aparece cuando hay algo que comunicar:
 * se pierde la conexion (persistente) o vuelve (aviso breve de 3 s).
 *
 * El estado de red es un sistema externo al arbol de React, por eso se lee con
 * useSyncExternalStore: en el servidor se asume "online" para que el HTML
 * hidrate sin franja.
 */
export function NetworkStatus() {
  const online = useSyncExternalStore(
    subscribeToNetwork,
    () => navigator.onLine,
    () => true,
  );
  const [justRestored, setJustRestored] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onOnline = () => {
      setJustRestored(true);
      timer = setTimeout(() => setJustRestored(false), 3000);
    };

    const onOffline = () => {
      clearTimeout(timer);
      setJustRestored(false);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (online && !justRestored) return null;

  const Icon = online ? Wifi : WifiOff;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "sticky top-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium",
        online ? "bg-emerald-600 text-white" : "bg-destructive text-white",
      )}
    >
      <Icon className="h-4 w-4" />
      {online ? "Conexion restablecida." : "Sin conexion. Mostrando datos guardados."}
    </div>
  );
}

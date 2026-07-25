"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isStandalone, shouldShowIosGuide } from "@/lib/pwa/detect";

/** Evento no estandar de Chromium para instalar la app. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "ecosort:install-dismissed";

function wasDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberDismiss(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Modo privado sin almacenamiento: el aviso volvera a aparecer, sin mas.
  }
}

function currentlyStandalone(): boolean {
  return isStandalone(
    window.matchMedia("(display-mode: standalone)").matches,
    (window.navigator as Navigator & { standalone?: boolean }).standalone,
  );
}

/** La plataforma no cambia durante la sesion: no hay nada a lo que suscribirse. */
const neverChanges = () => () => {};

function readIosGuide(): boolean {
  return shouldShowIosGuide({
    userAgent: window.navigator.userAgent,
    maxTouchPoints: window.navigator.maxTouchPoints,
    standalone: currentlyStandalone(),
    dismissed: wasDismissed(),
  });
}

/**
 * Invitacion a instalar la app.
 *  - Android / Chromium: usa el evento `beforeinstallprompt` y muestra el
 *    dialogo nativo del navegador.
 *  - iOS Safari: no existe ese evento, asi que se explican los pasos de
 *    "Compartir > Agregar a inicio".
 * No se muestra nada si la app ya esta instalada o el usuario lo descarto.
 */
export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  // Depende de APIs del navegador, por eso se lee como store externo: en el
  // servidor devuelve false y se corrige al hidratar.
  const iosGuide = useSyncExternalStore(neverChanges, readIosGuide, () => false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      if (wasDismissed() || currentlyStandalone()) return;
      // Evita el mini-infobar para mostrar nuestra invitacion en su lugar.
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstallEvent(null);
      setHidden(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }, [installEvent]);

  const dismiss = useCallback(() => {
    rememberDismiss();
    setInstallEvent(null);
    setHidden(true);
  }, []);

  const showIosGuide = iosGuide && !hidden;
  const showInstallButton = installEvent !== null && !hidden;

  if (!showInstallButton && !showIosGuide) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto mb-[calc(env(safe-area-inset-bottom)+1rem)] w-[calc(100%-2rem)] max-w-sm rounded-xl border border-border bg-card p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
          <Download className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Instala EcoSort AI</p>
          {showInstallButton ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Accede mas rapido desde tu pantalla de inicio.
            </p>
          ) : (
            <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              Toca
              <Share className="inline h-3.5 w-3.5" aria-label="Compartir" />
              Compartir y luego
              <SquarePlus className="inline h-3.5 w-3.5" aria-label="Agregar a inicio" />
              <span className="font-medium text-foreground">Agregar a inicio</span>.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Descartar"
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {showInstallButton ? (
        <Button className="mt-3 w-full" onClick={install}>
          Instalar aplicacion
        </Button>
      ) : null}
    </div>
  );
}

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Todas las rutas excepto:
     * - _next/static, _next/image
     * - favicon.ico y archivos estaticos de imagen
     * - archivos de la PWA (sw.js, manifest, iconos): deben servirse sin
     *   pasar por la sesion para que el navegador pueda instalarlos y
     *   actualizarlos incluso sin usuario autenticado.
     */
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

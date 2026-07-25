import type { MetadataRoute } from "next";
import { PWA_BACKGROUND_COLOR, PWA_THEME_COLOR } from "@/lib/pwa/constants";

/**
 * Manifest nativo del App Router. Se sirve en /manifest.webmanifest.
 *
 * `start_url` apunta a "/" porque la raiz redirige segun el rol/sesion, de modo
 * que la app instalada abre siempre en el lugar correcto sin cachear rutas
 * privadas. Los accesos directos solo apuntan a rutas que ya existen.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EcoSort AI",
    short_name: "EcoSort",
    description: "Clasificacion inteligente de residuos con IA e IoT",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: PWA_BACKGROUND_COLOR,
    theme_color: PWA_THEME_COLOR,
    lang: "es",
    dir: "ltr",
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Mis EcoPuntos",
        short_name: "EcoPuntos",
        url: "/home",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Monitor en vivo",
        short_name: "Monitor",
        url: "/monitor",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}

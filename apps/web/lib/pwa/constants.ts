/**
 * Constantes compartidas de la capa PWA (manifest, metadata y service worker).
 * Mantener sincronizado PWA_THEME_COLOR con el color usado en scripts/generate-pwa-icons.mjs.
 */

/** Verde de marca. Tine la barra de estado en Android y el splash de instalacion. */
export const PWA_THEME_COLOR = "#16a34a";

/** Fondo del splash screen durante el arranque de la app instalada. */
export const PWA_BACKGROUND_COLOR = "#ffffff";

/** Ruta de la pagina mostrada cuando no hay red y el recurso no esta en cache. */
export const OFFLINE_PATH = "/offline";

/** Ruta del service worker (servido desde public/, alcance de toda la app). */
export const SERVICE_WORKER_PATH = "/sw.js";

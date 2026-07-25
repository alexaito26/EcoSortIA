/**
 * EcoSort AI - Service Worker (Fase 5).
 *
 * Escrito a mano (sin next-pwa / workbox) para controlar exactamente que se
 * guarda en cache.
 *
 * REGLA DE SEGURIDAD PRINCIPAL
 * ---------------------------------------------------------------------------
 * El cache del navegador NO esta protegido por RLS y sobrevive al cierre de
 * sesion. Por eso NUNCA se cachea:
 *   - HTML de rutas privadas (/home, /dashboard, /monitor, /history, ...)
 *   - Respuestas de Supabase (otro origen: auth, REST, Realtime)
 *   - Rutas de autenticacion (/auth/*, /login, /register, ...)
 *   - Peticiones que no sean GET
 * Solo se cachean el app shell estatico, los iconos y la pagina offline.
 *
 * Al cambiar VERSION se crea un cache nuevo y el anterior se elimina en
 * `activate`, lo que permite detectar y aplicar nuevas versiones.
 */

const VERSION = "v1";
const STATIC_CACHE = `ecosort-static-${VERSION}`;
const ASSETS_CACHE = `ecosort-assets-${VERSION}`;
const CURRENT_CACHES = [STATIC_CACHE, ASSETS_CACHE];

const OFFLINE_URL = "/offline";

/** Recursos minimos para que la app arranque sin red. */
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

/** Prefijos de rutas cuyo HTML nunca debe guardarse en cache. */
const PRIVATE_PATH_PREFIXES = [
  "/home",
  "/dashboard",
  "/monitor",
  "/history",
  "/devices",
  "/logs",
  "/users",
  "/auth",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

function isPrivatePath(pathname) {
  return PRIVATE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Assets con hash de Next e iconos: inmutables, seguros para cache-first. */
function isImmutableAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // `reload` evita precachear una version vieja servida por el HTTP cache.
      await cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: "reload" })));
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => !CURRENT_CACHES.includes(key)).map((key) => caches.delete(key)),
      );
      // Navigation Preload acelera la primera respuesta de red en navegaciones.
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })(),
  );
});

/**
 * La pagina pide activar la version nueva (boton "Actualizar").
 * Sin este mensaje el SW nuevo esperaria a que se cierren todas las pestanas.
 */
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/** Navegacion: siempre red primero; si no hay red, pagina offline. */
async function handleNavigation(event) {
  try {
    const preloaded = await event.preloadResponse;
    if (preloaded) return preloaded;
    return await fetch(event.request);
  } catch {
    const cache = await caches.open(STATIC_CACHE);
    const offline = await cache.match(OFFLINE_URL);
    return (
      offline ??
      new Response("Sin conexion", {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8" },
      })
    );
  }
}

/** Assets inmutables: cache primero, red como respaldo. */
async function handleImmutable(request) {
  const cache = await caches.open(ASSETS_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Solo GET del mismo origen. Supabase (otro origen) y mutaciones pasan directo.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    return;
  }

  // Nunca interceptar datos de rutas privadas (RSC payload, route handlers).
  if (isPrivatePath(url.pathname)) return;

  if (isImmutableAsset(url)) {
    event.respondWith(handleImmutable(request));
  }
});

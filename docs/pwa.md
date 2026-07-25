# PWA - EcoSort AI (Fase 5)

La aplicacion web es una PWA instalable en Android e iOS sin pasar por Google
Play ni App Store. Se implemento con las capacidades nativas del App Router de
Next.js y un service worker escrito a mano (sin `next-pwa` ni Workbox), para
controlar exactamente que se guarda en cache.

## Piezas

| Archivo | Rol |
|---------|-----|
| `apps/web/app/manifest.ts` | Manifest generado en `/manifest.webmanifest` |
| `apps/web/public/sw.js` | Service worker (precache, offline, actualizacion) |
| `apps/web/app/layout.tsx` | Metadata, `viewport-fit: cover`, montaje de la capa PWA |
| `apps/web/lib/pwa/constants.ts` | Colores de marca y rutas compartidas |
| `apps/web/lib/pwa/detect.ts` | Deteccion de iOS / modo standalone (con pruebas) |
| `apps/web/components/pwa/service-worker-register.tsx` | Registro + aviso de nueva version |
| `apps/web/components/pwa/network-status.tsx` | Franja global de estado de red |
| `apps/web/components/pwa/install-prompt.tsx` | Instalacion Android + guia iOS |
| `apps/web/app/offline/page.tsx` | Pagina de respaldo sin conexion |
| `scripts/generate-pwa-icons.mjs` | Genera los iconos desde un unico original |

## Estrategia de cache (y por que)

El cache del navegador **no** esta protegido por RLS y sobrevive al cierre de
sesion. Por eso la regla es estricta:

| Recurso | Estrategia | Motivo |
|---------|-----------|--------|
| `/_next/static/*`, `/icons/*` | Cache-first | Llevan hash o son inmutables |
| `/offline`, manifest, iconos base | Precache en `install` | Necesarios para arrancar sin red |
| Navegaciones (HTML) | Solo red, con respaldo `/offline` | El HTML privado contiene datos del usuario |
| Rutas privadas (`/dashboard`, `/home`, ...) | Nunca se interceptan | Evita filtrar datos entre sesiones |
| Supabase (auth, REST, Realtime) | Nunca se interceptan | Otro origen; tokens y datos sensibles |
| Peticiones que no son GET | Nunca se interceptan | Las mutaciones siempre van a la red |

La prueba `lib/pwa/sw-privacy.test.ts` falla si se agrega una ruta protegida al
middleware y se olvida excluirla del service worker.

## Actualizacion de version

1. Al cambiar `sw.js` se incrementa la constante `VERSION`.
2. El navegador instala el service worker nuevo y lo deja en espera.
3. La app muestra el aviso **"Nueva version disponible"**.
4. Al pulsar *Actualizar* se envia `SKIP_WAITING` y la pagina se recarga cuando
   cambia el controlador, de modo que nunca queda mitad vieja y mitad nueva.

Los caches de versiones anteriores se borran en el evento `activate`.
`sw.js` se sirve con `Cache-Control: no-cache` para que el navegador nunca se
quede atrapado en una version antigua.

## Probar la PWA en local

El service worker **solo se registra en produccion**, porque en desarrollo los
chunks de Next no son inmutables y el cache serviria codigo obsoleto.

```bash
pnpm --filter web build
pnpm --filter web start   # http://localhost:3000
```

Comprobaciones en Chrome DevTools:

- **Application > Manifest**: nombre, iconos y "Installability" sin errores.
- **Application > Service Workers**: `sw.js` activado.
- **Network > Offline** y recarga: aparece la pagina `/offline`.
- **Lighthouse > PWA**: instalable.

Para probar en un movil real hace falta HTTPS (los service workers solo
funcionan en `localhost` o con TLS). Usa el despliegue de Vercel de la Fase 7 o
un tunel HTTPS.

## Instalacion en Android

1. Abrir la app en Chrome.
2. Aparece la tarjeta **"Instala EcoSort AI"** > *Instalar aplicacion*.
3. Alternativa: menu ⋮ > *Instalar aplicacion* / *Agregar a pantalla principal*.

Se abre en modo standalone, sin barra de direcciones, con la barra de estado en
verde (`theme_color`).

## Instalacion en iOS

Safari no soporta `beforeinstallprompt`, asi que la app muestra instrucciones:

1. Abrir la app en **Safari** (Chrome en iOS no puede instalar PWAs).
2. Tocar **Compartir**.
3. Elegir **Agregar a inicio**.
4. Confirmar.

El modo standalone se activa con `apple-mobile-web-app-capable` y el icono usa
`apple-touch-icon.png` (180x180).

Limitaciones conocidas de iOS: sin Web Push salvo que la app este instalada
(iOS 16.4+), cuota de almacenamiento menor y el service worker se descarta antes
que en Android.

## Areas seguras (notch y barra de gestos)

`viewport-fit: cover` mas las variables `env(safe-area-inset-*)` expuestas como
utilidades de Tailwind (`pt-safe-top`, `pb-safe-bottom`, ...). El layout raiz ya
las aplica al `body`, y los avisos flotantes suman el inset inferior para no
quedar bajo la barra de gestos.

## Comportamiento offline

- **Franja de estado**: aparece al perder la red y confirma cuando vuelve.
- **Pagina offline**: respaldo de navegacion, sin datos de usuario.
- **Realtime**: al recuperar la conexion el monitor recrea el canal de Supabase
  y pide datos frescos al servidor, para no perder eventos ocurridos mientras
  no habia red.

## Regenerar los iconos

```bash
# Reemplaza assets/ecosort-icon-source.png (cuadrado, >= 1024 px)
pnpm icons:generate
```

Genera `icon-192`, `icon-512`, `maskable-192`, `maskable-512`,
`apple-touch-icon` y `favicon-32`. Los maskable llevan margen interno (safe zone
del 80%) para que Android pueda recortarlos sin cortar el simbolo.

## Pendiente (P1)

Notificaciones Web Push con VAPID: las variables `VAPID_PUBLIC_KEY` y
`VAPID_PRIVATE_KEY` ya estan reservadas en `.env.example`.

# EcoSort AI

Sistema Full-Stack + IoT para la clasificacion inteligente de residuos. Monorepo
gestionado con **pnpm** + **Turborepo**.

## Estructura del monorepo

```
ecosort-ai/
  apps/web/                 Aplicacion Next.js (App Router) + PWA mobile-first
  packages/shared/          Tipos y esquemas Zod compartidos (@ecosort/shared)
  supabase/                 Migraciones, Edge Functions y seed (PostgreSQL + Auth + RLS)
  firmware/esp32-control/   Firmware PlatformIO del ESP32-S3 (Fase 6)
  scripts/device-simulator/ Simulador Node.js de eventos de dispositivo (Fase 4)
  docs/                     Documentacion del proyecto
```

## Stack

- **Web**: Next.js 16 (App Router), TypeScript estricto, Tailwind CSS 4, shadcn/ui,
  Zod, Recharts, PWA (manifest + service worker + offline).
- **Backend**: Supabase PostgreSQL, Auth, Row Level Security, Realtime, Edge Functions.
- **IoT**: ESP32 (PlatformIO), simulador Node.js.
- **Infra**: Vercel para el despliegue de `apps/web`.

## Requisitos

- Node.js >= 24 (ver `.nvmrc`)
- pnpm >= 11 (`npm install -g pnpm` o `corepack enable pnpm`)

## Produccion

Web en Vercel: **https://ecosort-ai-pi.vercel.app**

Detalle del despliegue (variables, Root Directory, redirects de Supabase Auth)
en [`docs/deployment.md`](./docs/deployment.md).

## Primeros pasos

```bash
pnpm install
cp .env.example apps/web/.env.local
pnpm dev
```

## Scripts

| Comando          | Descripcion                                  |
| ---------------- | -------------------------------------------- |
| `pnpm dev`       | Levanta las apps en modo desarrollo          |
| `pnpm build`     | Compila todos los paquetes/apps              |
| `pnpm lint`      | Linter en todo el monorepo                   |
| `pnpm typecheck` | Verificacion de tipos                        |
| `pnpm format`    | Formatea con Prettier                        |

## Fases del proyecto

1. Bootstrap del monorepo
2. Supabase y autenticacion
3. Aplicacion funcional (dashboard, monitor, historial, etc.)
4. Backend IoT (Edge Functions + simulador)
5. PWA (manifest, service worker, offline, instalacion Android/iOS)
6. Firmware ESP32-S3 (ver [`docs/firmware.md`](./docs/firmware.md))
7. Despliegue en Vercel (ver [`docs/deployment.md`](./docs/deployment.md))

Ver [`docs/`](./docs) para mas detalle.

# Arquitectura - EcoSort AI

Sistema Full-Stack + IoT para clasificacion inteligente de residuos.

## Componentes

```
Dispositivo ESP32  --HTTPS-->  Supabase Edge Functions  -->  PostgreSQL (RLS)
     (firmware)                 (ingest / heartbeat)              |
        |                                                         | Realtime
        | UART                                                    v
   Modulo de vision                               Next.js (apps/web) + PWA
                                                   (dashboard, monitor, historial)
```

## Piezas del monorepo

| Ruta                        | Rol                                                        |
| --------------------------- | ---------------------------------------------------------- |
| `apps/web`                  | Frontend Next.js (App Router) + PWA mobile-first           |
| `packages/shared`           | Tipos y esquemas Zod compartidos                           |
| `supabase`                  | Migraciones, Edge Functions, seed (PostgreSQL/Auth/RLS)    |
| `firmware/esp32-control`    | Firmware del dispositivo (PlatformIO)                      |
| `scripts/device-simulator`  | Simulador de eventos de dispositivo (Node.js)             |

## Principios

- **Seguridad**: RLS como fuente de autorizacion; `service_role` solo en servidor;
  sin secretos en el repositorio; variables publicas y privadas separadas.
- **Idempotencia**: los eventos de dispositivo se deduplican por `event_id`.
- **Realtime**: la web se suscribe a cambios; la PWA reconecta al recuperar red.
- **Migraciones versionadas**: todo cambio de esquema pasa por `supabase/migrations`.

## Estado por fase

Ver el listado de fases en el [README raiz](../README.md). Esta base corresponde
a la Fase 1 (bootstrap del monorepo).

# Simulador de dispositivo (Fase 4)

`scripts/device-simulator` representa al ESP32 de control. Envia eventos y
latidos a las Edge Functions usando `fetch`. Nunca imprime el token.

## Configuracion

Variables de entorno (usa un `.env` local, nunca en Git):

```
ECOSORT_API_BASE_URL=https://<project-ref>.supabase.co/functions/v1
ECOSORT_DEVICE_CODE=ECOSORT-01
ECOSORT_DEVICE_TOKEN=<token generado con pnpm token:generate>
ECOSORT_ANON_KEY=<clave publishable/anon, si el gateway la exige>
```

## Comandos

```bash
pnpm simulator:event        # una clasificacion (--material plastic|glass|reject|random)
pnpm simulator:heartbeat    # un latido
pnpm simulator:stream       # latidos + clasificaciones periodicas (Ctrl+C para parar)
pnpm simulator:error        # simula routing/sensor/system error (--kind)
pnpm simulator:duplicate    # envia el mismo event_id dos veces (verifica idempotencia)
```

## Opciones (CLI)

| Flag | Comando | Descripcion |
|------|---------|-------------|
| `--material` | event | `plastic`, `glass`, `reject` o `random` |
| `--confidence` | event | 0..1 |
| `--routing-success` | event | `true`/`false` |
| `--user-id` | event | UUID para atribuir EcoPuntos |
| `--interval` | stream | segundos entre ciclos (def. 30) |
| `--count` | stream | numero de ciclos (def. infinito) |
| `--kind` | error | `routing`, `sensor`, `system` |
| `--state` `--rssi` | heartbeat | estado y RSSI simulados |

Los `event_id` se generan unicos (`evt-YYYYMMDD-<uuid8>`).

## Ejemplos

```bash
pnpm simulator:event -- --material glass --confidence 0.9
pnpm simulator:stream -- --interval 10 --count 5
pnpm simulator:error -- --kind sensor
pnpm simulator:duplicate
```

## Prueba de duplicados

`pnpm simulator:duplicate` envia dos veces el mismo `event_id`. La primera
respuesta trae `duplicate: false` y la segunda `duplicate: true`, sin duplicar
clasificaciones ni EcoPuntos.

## Solucion de problemas

- **401 MISSING_CREDENTIALS / INVALID_TOKEN**: revisa `ECOSORT_DEVICE_TOKEN`
  (regeneralo con `pnpm token:generate`).
- **404 DEVICE_NOT_FOUND**: `ECOSORT_DEVICE_CODE` no existe.
- **403 DEVICE_DISABLED**: el dispositivo tiene `is_active = false`.
- **401 del gateway**: define `ECOSORT_ANON_KEY` con la clave publishable/anon.
- **No aparece en el dashboard**: confirma que Realtime esta activo (migracion
  `0004`) y que la sesion tiene rol staff.

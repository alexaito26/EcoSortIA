# Plan de pruebas - Backend IoT (Fase 4)

## Pruebas unitarias (Vitest)

`packages/shared/src/iot.test.ts` valida el contrato (fuente unica de verdad que
las Edge Functions replican):

- Evento valido de plastico / vidrio / rechazado.
- Material invalido.
- `confidence` < 0 y > 1.
- Nivel de contenedor < 0 y > 100.
- `event_id` demasiado largo.
- `event_type` no permitido.
- `material` obligatorio en `classification_completed`.
- Heartbeat valido / sin `device_code` / `wifi_rssi` fuera de rango.

Ejecutar: `pnpm test`.

## Pruebas de integracion (simulador + Edge Functions desplegadas)

| Caso | Comando / accion | Esperado |
|------|------------------|----------|
| Heartbeat valido | `pnpm simulator:heartbeat` | 200, `last_seen_at` actualizado |
| Evento valido | `pnpm simulator:event` | 200, aparece en historial y metricas |
| Evento duplicado | `pnpm simulator:duplicate` | 1a `duplicate:false`, 2a `duplicate:true`, sin doble conteo |
| Error de ruteo | `pnpm simulator:error -- --kind routing` | 200, `routing_events.success=false` + log |
| Error de sensor | `pnpm simulator:error -- --kind sensor` | 200, `system_logs` (source sensor) |
| Token faltante | POST sin `x-device-token` | 401 `MISSING_CREDENTIALS` |
| Token invalido | token erroneo | 401 `INVALID_TOKEN` |
| Dispositivo inexistente | `x-device-code` desconocido | 404 `DEVICE_NOT_FOUND` |
| Dispositivo deshabilitado | `is_active=false` | 403 `DEVICE_DISABLED` |
| JSON invalido | body malformado | 400 `INVALID_JSON` |
| Metodo no permitido | GET | 405 `METHOD_NOT_ALLOWED` |
| Body demasiado grande | > 8 KB | 413 `BODY_TOO_LARGE` |

## Atomicidad e idempotencia

- La RPC `ingest_device_event` usa `device_events.event_id` (UNIQUE) como ancla:
  si el evento ya existe retorna `duplicate:true` sin escribir nada mas.
- Toda la escritura (clasificacion, ruteo, contenedores, lecturas, logs,
  dispositivo) ocurre en una sola transaccion.
- EcoPuntos: trigger idempotente por `classification_id`, sin duplicados en
  reintentos.

## Seed vs simulador vs firmware

El panel **siempre lee Supabase de verdad**. Lo que cambia es el origen de las
filas. Usa esta tabla para no confundir demo con ingest:

| Origen | Como se genera | Huella en la BD | Hardware |
| ------ | -------------- | --------------- | -------- |
| Seed (`supabase/seed.sql`) | Solo bootstrap: cuentas + dispositivo + contenedores **vacios**. Sin historial. | Sin clasificaciones de demo | No |
| Simulador Node | `pnpm simulator:event` (etc.) | `event_id` empieza por `evt-`, `occurred_at` ≈ ahora, Realtime mueve `/monitor` | No (cliente HTTP) |
| Firmware ESP32 | Placa flasheada + WiFi + token | Mismo contrato `evt-…`, `last_seen_at` se actualiza sin el PC | Si |

Para vaciar historial en un proyecto ya sembrado: ejecutar
[`scripts/clear-operational-data.sql`](../scripts/clear-operational-data.sql).

### Checklist en 2 minutos (prueba de vida)

1. Login staff → `/monitor` (badge “En vivo”).
2. Configurar env del simulador (ver [device-simulator.md](./device-simulator.md)):
   `ECOSORT_API_BASE_URL`, `ECOSORT_DEVICE_CODE`, `ECOSORT_DEVICE_TOKEN`,
   `ECOSORT_ANON_KEY` (valores desde tu `.env` / proyecto Supabase; no hardcodear).
3. Ejecutar: `pnpm simulator:event -- --material glass --confidence 0.9`
4. Sin recargar la pagina: nueva clasificacion / niveles / `last_seen_at`.
5. SQL de confirmacion:

```sql
select event_id, type, occurred_at, created_at
from public.device_events
where event_id like 'evt-%'
order by occurred_at desc
limit 10;
```

Si solo ves filas del seed y el simulador no mueve nada, revisa token/env del
simulador (auth), no la UI.

## Verificacion en el dashboard

Tras `pnpm simulator:stream`, comprobar sin recargar (Realtime):
- Monitor: dispositivo `online`, ultimo evento y niveles cambian.
- Historial: nuevas clasificaciones y eventos de ruteo.
- Dashboard: metricas y graficos se actualizan.
- Estado `offline` automatico tras 90 s sin latido.

## Resultado de la ejecucion inicial (2026-07-11)

Todos los casos anteriores verificados contra el proyecto real: heartbeat 200,
evento 200, duplicado reconocido (sin doble conteo en `classifications` ni
`device_events`), errores 401/403/404/405, y `effective_status` pasando a
`offline` tras el umbral.

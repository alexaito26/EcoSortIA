# Device Simulator - EcoSort AI

Simulador Node.js/TypeScript que emula el ESP32 de control enviando eventos y
latidos a las Edge Functions de Supabase.

## Configuracion

Variables de entorno (usa un `.env` local, nunca en Git):

```
ECOSORT_API_BASE_URL=https://<project-ref>.supabase.co/functions/v1
ECOSORT_DEVICE_CODE=ECOSORT-01
ECOSORT_DEVICE_TOKEN=<token generado con: pnpm token:generate>
ECOSORT_ANON_KEY=<clave publishable/anon, si el gateway la exige>
```

## Comandos

```bash
pnpm simulator:event        # una clasificacion
pnpm simulator:heartbeat    # un latido
pnpm simulator:stream       # latidos + clasificaciones periodicas
pnpm simulator:error        # routing/sensor/system error (--kind)
pnpm simulator:duplicate    # mismo event_id dos veces (idempotencia)
```

Documentacion completa: `docs/device-simulator.md` y `docs/api-contract.md`.

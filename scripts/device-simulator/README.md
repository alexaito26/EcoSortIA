# Device Simulator - EcoSort AI

Simulador Node.js que emula un ESP32 enviando eventos al backend.

> Estado: **stub**. Implementacion completa en la **Fase 4**.

## Uso (Fase 4)

```bash
# Requiere variables de entorno (ver .env.example en la raiz):
#   SIMULATOR_SUPABASE_URL, SIMULATOR_DEVICE_TOKEN
pnpm --filter @ecosort/device-simulator start
```

Los eventos se validan con los esquemas Zod de `@ecosort/shared` y respetan
la idempotencia por `event_id`.

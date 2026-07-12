# Contrato de API - Backend IoT (Fase 4)

Flujo: `ESP32-S3 (IA) → UART → ESP32 control → HTTPS → Edge Function → PostgreSQL → Realtime → Dashboard`.

El ESP32 **nunca** escribe directo en las tablas. Toda escritura pasa por Edge
Functions que autentican por token y delegan en RPCs atomicas.

Base de URLs: `https://<project-ref>.supabase.co/functions/v1`

## Headers comunes

| Header | Obligatorio | Ejemplo |
|--------|-------------|---------|
| `content-type` | si | `application/json` |
| `x-device-code` | si | `ECOSORT-01` |
| `x-device-token` | si | (token del dispositivo) |
| `apikey` | segun gateway | clave publishable/anon |

## POST /ingest-device-event

Registra un evento del dispositivo. Idempotente por `event_id`.

### Body

```json
{
  "event_id": "evt-20260711-00001",
  "device_code": "ECOSORT-01",
  "event_type": "classification_completed",
  "occurred_at": "2026-07-11T18:30:00-05:00",
  "payload": {
    "material": "plastic",
    "confidence": 0.93,
    "model_version": "yolov8n-v3",
    "routed_to": "plastic_bin",
    "routing_success": true,
    "processing_time_ms": 1480,
    "eco_points": 10,
    "servo_target": 45,
    "user_id": "<uuid opcional>",
    "bin_levels": { "plastic": 42, "glass": 18, "reject": 5 }
  }
}
```

### Tipos de evento (`event_type`)

| Tipo | Efecto en la base |
|------|-------------------|
| `classification_completed` | inserta `classifications` + `routing_events` (+ log si falla) + niveles |
| `classification_rejected` | inserta `classifications` (sin ruteo, 0 EcoPuntos) |
| `routing_error` | inserta `routing_events` (success=false) + `system_logs` |
| `sensor_error` | inserta `system_logs` (source sensor) + niveles |
| `system_error` | inserta `system_logs` (critical, source system) |

### Materiales permitidos

`plastic`, `glass`, `reject`, `unknown`.

### Validaciones

Metodo POST; `content-type: application/json`; headers presentes; tamano de
body <= 8 KB; JSON valido; `device_code` del body == header; `event_id` 1..128;
`occurred_at` fecha valida; `event_type` permitido; `material` permitido;
`confidence` 0..1; `processing_time_ms` >= 0; `eco_points` >= 0; `bin_levels`
0..100. `classification_completed` exige `material` + `confidence`.

### Respuestas

```json
{ "success": true, "duplicate": false, "event_id": "evt-20260711-00001" }
```
```json
{ "success": true, "duplicate": true, "event_id": "evt-20260711-00001" }
```

Los EcoPuntos solo se otorgan si el evento trae `user_id` valido y
`routing_success = true` (trigger idempotente por `classification_id`).

## POST /device-heartbeat

### Body

```json
{
  "device_code": "ECOSORT-01",
  "firmware_version": "1.0.0",
  "model_version": "yolov8n-v3",
  "state": "READY",
  "wifi_rssi": -58,
  "uptime_seconds": 3200,
  "free_heap": 180000,
  "bin_levels": { "plastic": 42, "glass": 18, "reject": 5 }
}
```

Actualiza `last_seen_at`, `status` (a `online`, respeta `maintenance`),
firmware/modelo y niveles. Registra log **solo** ante anomalias
(`wifi_rssi < -85`, estado no operativo). No genera log en cada latido.

### Respuesta

```json
{ "success": true, "server_time": "2026-07-11T23:30:00.000Z", "next_heartbeat_seconds": 30 }
```

## Codigos HTTP

| Codigo | Situacion |
|--------|-----------|
| 200 | evento/heartbeat procesado o duplicado reconocido |
| 400 | JSON invalido, campos invalidos, content-type incorrecto, device_code no coincide |
| 401 | token faltante o incorrecto |
| 403 | dispositivo deshabilitado (`is_active = false`) |
| 404 | dispositivo inexistente |
| 405 | metodo no permitido |
| 413 | body demasiado grande |
| 500 | error interno (nunca expone detalles) |

Errores: `{ "success": false, "error": "CODIGO" }`. Nunca se devuelven
`token_hash`, `service_role`, SQL interno, stack traces ni datos de otros
dispositivos.

## Estado del dispositivo

`public.device_effective_status(status, last_seen_at, threshold=90s)`:
- `maintenance` / `error`: manuales, se respetan.
- sin latido reciente (> 90 s) o nulo: `offline`.
- en caso contrario: `online`.

El dashboard usa `effectiveDeviceStatus()` (mismo umbral) para mostrarlo.

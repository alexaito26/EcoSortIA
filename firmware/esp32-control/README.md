# Firmware ESP32 - EcoSort AI

Proyecto PlatformIO para el controlador ESP32 del clasificador de residuos.

> Estado: **estructura inicial (stub)**. La implementacion completa llega en la
> **Fase 6**.

## Alcance previsto (Fase 6)

- WiFi + HTTPS hacia Edge Functions de Supabase.
- UART con el modulo de clasificacion.
- Control de servo para ruteo.
- Sensores de nivel de contenedor.
- Pantalla TFT desacoplada.
- Maquina de estados, cola offline y reintentos.

## Seguridad

- No versionar credenciales (WiFi, tokens de dispositivo).
- Usar un archivo de secretos local ignorado por Git.

## Compilar (cuando exista PlatformIO)

```bash
pio run
pio run --target upload
pio device monitor
```

# Firmware ESP32-S3 - EcoSort AI

Controlador del clasificador de residuos: recibe la clasificacion del modulo
de vision por UART, rutea el residuo con dos servos y reporta cada evento a
las Edge Functions de Supabase.

## Hardware

| Componente               | Conexion                                        |
| ------------------------ | ----------------------------------------------- |
| Placa                    | ESP32-S3 DevKitC-1                              |
| Servo de giro            | GPIO 5                                          |
| Servo de compuerta       | GPIO 6                                          |
| HC-SR04 plastico         | trig 7 / echo 15                                |
| HC-SR04 vidrio           | trig 16 / echo 17                               |
| HC-SR04 rechazo          | trig 18 / echo 8                                |
| UART modulo de vision    | RX 4 / TX 9 a 115200 baudios                    |
| TFT ILI9341 (opcional)   | MOSI 11 / SCLK 12 / MISO 13 / CS 10 / DC 14 / RST 21 / BL 47 |
| LED de estado            | GPIO 48                                         |

Los pines y los tiempos se cambian en un unico sitio: `include/config.h`.

## Puesta en marcha

```bash
# 1. Credenciales (archivo ignorado por Git)
cp include/secrets.h.example include/secrets.h

# 2. Token del dispositivo, desde la raiz del monorepo
pnpm token:generate -- --device ECOSORT-01

# 3. Compilar y subir
pio run                      # compila
pio run --target upload      # sube a la placa
pio device monitor           # trazas a 115200
```

## Entornos de compilacion

| Entorno         | Para que sirve                                          |
| --------------- | ------------------------------------------------------- |
| `esp32-s3`      | Firmware normal, estado por el monitor serie (por defecto) |
| `esp32-s3-tft`  | Igual + pantalla ILI9341                                |
| `native`        | Pruebas de la logica pura en el PC, sin placa           |

```bash
pio run -e esp32-s3-tft
pio test -e native
```

## Estructura

```
lib/ecosort_core/   Logica pura, sin Arduino: modelo, payloads, cola offline,
                    parser UART y backoff. Es lo que cubren las pruebas native.
src/app/            Maquina de estados.
src/net/            WiFi, cliente HTTPS y despachador de eventos.
src/io/             Servos, sensores HC-SR04 y UART de vision.
src/ui/             Pantalla: implementacion Serial y ILI9341.
include/            Cabeceras, config.h y secrets.h (local).
test/               Pruebas Unity del nucleo.
```

## Maquina de estados

```
BOOT -> CONNECTING -> READY -> CLASSIFYING -> ROUTING -> REPORTING -> READY
                        ^                                              |
                        +----------------- ERROR <---------------------+
```

La falta de red no detiene la clasificacion: el dispositivo pasa a `READY`
igualmente y los eventos esperan en la cola offline. Solo un fallo de sensores
o de los servos lleva a `ERROR`, del que se sale solo cuando los sensores
vuelven a dar lecturas validas.

## Modo offline

Los eventos se encolan antes de enviarse y se guardan en NVS, asi que
sobreviven a un corte de luz. Al reconectar se vacian en orden con backoff
exponencial (2 s hasta 60 s).

Como el `event_id` se genera al crear el evento y no al enviarlo, un reintento
tras un timeout ambiguo llega con el mismo id y la Edge Function lo trata como
duplicado en lugar de contar la clasificacion dos veces. La cola guarda 50
eventos; al llenarse descarta el mas antiguo.

Un evento rechazado con 4xx (payload o token invalidos) se descarta en vez de
reintentarse: nunca va a ser aceptado y bloquearia la cola entera.

## Seguridad

- `include/secrets.h` esta en `.gitignore`. Solo se versiona la plantilla.
- TLS validado contra el certificado raiz de `include/net/root_ca.h`.
  `-D ECOSORT_TLS_INSECURE=1` desactiva la validacion: solo para depurar,
  nunca en produccion.
- El token del dispositivo viaja en el header `x-device-token` y en la base de
  datos solo existe su hash bcrypt.

## Protocolo UART

El modulo de vision envia una linea JSON por clasificacion:

```json
{"material":"plastic","confidence":0.93,"processing_time_ms":1480,"model_version":"yolov8n-v3"}
```

`material` acepta `plastic`, `glass`, `reject` y `unknown`. Las lineas
invalidas se descartan y se cuentan como error de protocolo. Por debajo de
`VISION_MIN_CONFIDENCE` (0.60) el residuo va a rechazo y el evento se reporta
como `classification_rejected`.

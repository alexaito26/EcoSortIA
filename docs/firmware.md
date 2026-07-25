# Firmware ESP32-S3 (Fase 6)

Firmware del dispositivo EcoSort: recibe la clasificacion del modulo de vision
por UART, rutea el residuo con dos servos y reporta cada evento a las Edge
Functions de Supabase.

Codigo en [`firmware/esp32-control`](../firmware/esp32-control). Para pines,
comandos y puesta en marcha ver su [README](../firmware/esp32-control/README.md).

## Hardware

- **Placa**: ESP32-S3 DevKitC-1
- **Ruteo**: dos servos, uno de giro de tolva y otro de compuerta
- **Nivel de contenedores**: tres sensores ultrasonicos HC-SR04
- **Pantalla**: TFT ILI9341 SPI (opcional)
- **Vision**: modulo externo conectado por UART a 115200 baudios

Todos los pines y tiempos estan en `include/config.h`. No hay numeros de pin
repartidos por el codigo.

## Arquitectura

La decision principal fue separar la logica pura del hardware:

```
lib/ecosort_core/   Sin dependencias de Arduino. Modelo de dominio, construccion
                    de payloads, event_id, cola offline, parser UART y backoff.
                    Se compila y prueba en el PC.
src/app/            Maquina de estados.
src/net/            WiFi, cliente HTTPS y despachador de eventos.
src/io/             Servos, sensores HC-SR04 y UART de vision.
src/ui/             Pantalla, detras de una interfaz abstracta.
```

Gracias a esa separacion, lo que puede corromper datos en Supabase (parseo del
UART, formato de los payloads, idempotencia, cola offline) se prueba sin placa:

```bash
cd firmware/esp32-control
pio test -e native     # 21 pruebas Unity
```

## Maquina de estados

```
BOOT -> CONNECTING -> READY -> CLASSIFYING -> ROUTING -> REPORTING -> READY
                        ^                                              |
                        +----------------- ERROR <---------------------+
```

Regla central: **la falta de red no detiene la clasificacion**. Si el WiFi no
conecta, el dispositivo pasa a `READY` igualmente, sigue clasificando y ruteando,
y los eventos esperan en la cola offline. Solo un fallo de sensores o de los
servos lleva a `ERROR`, del que se sale automaticamente cuando los sensores
recuperan lecturas validas.

## Cola offline e idempotencia

Todo evento se encola antes de enviarse y se persiste en NVS, asi que sobrevive
a un corte de luz. Al recuperar la red se vacia en orden con backoff exponencial
de 2 s a 60 s.

El `event_id` se genera al **crear** el evento, no al enviarlo. Si un envio
termina en timeout ambiguo (el servidor lo recibio pero la respuesta se perdio),
el reintento llega con el mismo id y la Edge Function lo marca como duplicado en
lugar de contar la clasificacion dos veces. El formato es
`evt-<bootId>-<contador>`, y el `bootId` es aleatorio en cada arranque para que
un reinicio no reutilice ids.

La cola guarda 50 eventos. Al llenarse descarta el **mas antiguo**: en un
clasificador interesa mas lo que acaba de pasar. Un evento rechazado con 4xx se
descarta en vez de reintentarse, porque nunca sera aceptado y bloquearia la cola.

## Decisiones de clasificacion

- Confianza por debajo de `VISION_MIN_CONFIDENCE` (0.60) o material desconocido
  -> el residuo va a **rechazo** y el evento se reporta como
  `classification_rejected`. Preferimos mandar un reciclable a rechazo antes que
  contaminar un contenedor limpio.
- Las lineas UART corruptas se descartan y se cuentan como error de protocolo:
  el ruido electrico no debe generar clasificaciones inventadas.

## Seguridad

- Las credenciales viven en `include/secrets.h`, ignorado por Git. Solo se
  versiona `secrets.h.example`.
- TLS validado contra el certificado raiz incluido en `include/net/root_ca.h`
  (ISRG Root X1). El flag `-D ECOSORT_TLS_INSECURE=1` desactiva la validacion y
  existe solo para depurar: sin validar el certificado, cualquiera en la red
  puede suplantar al servidor y quedarse con el token del dispositivo.
- El token se genera con `pnpm token:generate` y en la base de datos solo queda
  su hash bcrypt.

## Estado de verificacion

| Comprobacion                          | Estado                          |
| ------------------------------------- | ------------------------------- |
| Pruebas de la logica pura (`native`)  | 21/21 en verde                  |
| Compilacion para ESP32-S3             | Pendiente (ver nota siguiente)  |

### Nota sobre la compilacion

La compilacion para la placa esta pendiente de verificar por un problema ajeno
al proyecto: el almacenamiento donde PlatformIO aloja sus paquetes
(`usc1.contabostorage.com`) dejo de resolver por DNS, y las descargas se quedan
en un bucle de reintentos.

Lo ya resuelto en esta maquina:

- `tool-esptoolpy` instalado a mano desde PyPI (`esptool 4.11.0`) en
  `~/.platformio/packages/tool-esptoolpy`, con su `package.json` y `.piopm`.
- `ArduinoJson` y `ESP32Servo` copiadas a `.pio/libdeps/esp32-s3`.
- Versiones fijadas en `platformio.ini` para no volver a consultar el registry.

Si la compilacion sigue colgandose, lo mas practico es abrir
`firmware/esp32-control` con la extension PlatformIO IDE de VS Code y compilar
desde ahi, o reintentar cuando PlatformIO restablezca su CDN.

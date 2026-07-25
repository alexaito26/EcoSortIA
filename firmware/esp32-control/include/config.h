#pragma once

/**
 * Configuracion de hardware y tiempos del dispositivo EcoSort.
 *
 * Este archivo SI se versiona: no debe contener credenciales.
 * Las credenciales (WiFi, token de dispositivo, URL de Supabase) viven en
 * include/secrets.h, ignorado por Git. Ver secrets.h.example.
 *
 * Placa objetivo: ESP32-S3 DevKitC-1.
 * Los GPIO 26-37 estan reservados por la flash/PSRAM octal y no se usan aqui.
 */

#define ECOSORT_FIRMWARE_VERSION "1.0.0"

// ---------------------------------------------------------------------------
// Servos de ruteo
// ---------------------------------------------------------------------------

// Servo de giro: apunta la tolva al contenedor del material clasificado.
#define PIN_SERVO_ROTATION 5
// Servo de compuerta: libera el residuo una vez apuntada la tolva.
#define PIN_SERVO_GATE 6

// Angulos de giro por material (grados).
#define SERVO_ANGLE_PLASTIC 30
#define SERVO_ANGLE_GLASS 90
#define SERVO_ANGLE_REJECT 150
#define SERVO_ANGLE_HOME 90

// Angulos de la compuerta.
#define SERVO_GATE_CLOSED 0
#define SERVO_GATE_OPEN 80

// Tiempos del ciclo de ruteo (ms).
#define SERVO_ROTATION_SETTLE_MS 600
#define SERVO_GATE_OPEN_MS 700
#define SERVO_GATE_CLOSE_MS 400

// ---------------------------------------------------------------------------
// Sensores de nivel HC-SR04 (uno por contenedor)
// ---------------------------------------------------------------------------

#define PIN_ULTRASONIC_PLASTIC_TRIG 7
#define PIN_ULTRASONIC_PLASTIC_ECHO 15
#define PIN_ULTRASONIC_GLASS_TRIG 16
#define PIN_ULTRASONIC_GLASS_ECHO 17
#define PIN_ULTRASONIC_REJECT_TRIG 18
#define PIN_ULTRASONIC_REJECT_ECHO 8

// Geometria del contenedor (cm). El nivel 0% corresponde a `EMPTY` de
// distancia sensor-residuo y 100% a `FULL`.
#define BIN_DISTANCE_EMPTY_CM 45.0f
#define BIN_DISTANCE_FULL_CM 8.0f

// Lecturas fuera de este rango se consideran invalidas (sensor desconectado
// o eco perdido) y no se reportan.
#define ULTRASONIC_MIN_VALID_CM 2.0f
#define ULTRASONIC_MAX_VALID_CM 400.0f
#define ULTRASONIC_TIMEOUT_US 30000UL

// Umbral a partir del cual el contenedor se considera lleno.
#define BIN_FULL_THRESHOLD_PERCENT 90

// ---------------------------------------------------------------------------
// UART con el modulo de vision (ESP32-S3 de IA)
// ---------------------------------------------------------------------------

#define PIN_VISION_RX 4
#define PIN_VISION_TX 9
#define VISION_UART_BAUD 115200
#define VISION_UART_PORT 1

// Confianza minima para aceptar una clasificacion. Por debajo se rutea a
// rechazo y se reporta como classification_rejected.
#define VISION_MIN_CONFIDENCE 0.60f

// ---------------------------------------------------------------------------
// Pantalla TFT ILI9341 (opcional)
// ---------------------------------------------------------------------------
// Los pines SPI se definen como flags de compilacion en platformio.ini
// (entorno esp32-s3-tft) porque TFT_eSPI los necesita en tiempo de compilacion.

#define PIN_TFT_BACKLIGHT 47

// ---------------------------------------------------------------------------
// Indicadores
// ---------------------------------------------------------------------------

#define PIN_STATUS_LED 48

// ---------------------------------------------------------------------------
// Red y envio de eventos
// ---------------------------------------------------------------------------

#define WIFI_CONNECT_TIMEOUT_MS 20000UL
#define WIFI_RETRY_INTERVAL_MS 5000UL
#define HTTP_TIMEOUT_MS 10000UL

// Latido periodico. Debe ser menor que el umbral de offline del backend
// (90 s en docs/api-contract.md) para no aparecer caido sin estarlo.
#define HEARTBEAT_INTERVAL_MS 30000UL

#define SENSOR_READ_INTERVAL_MS 5000UL

// Cola offline: eventos guardados cuando no hay red. Al llenarse se descarta
// el mas antiguo. ~50 eventos entran de sobra en NVS.
#define EVENT_QUEUE_CAPACITY 50
#define EVENT_QUEUE_NVS_NAMESPACE "ecosort"
#define EVENT_QUEUE_NVS_KEY "pending"

// Backoff exponencial de reintentos de red.
#define RETRY_BASE_DELAY_MS 2000UL
#define RETRY_MAX_DELAY_MS 60000UL

// Sincronizacion horaria (occurred_at debe ser un instante real).
#define NTP_SERVER_PRIMARY "pool.ntp.org"
#define NTP_SERVER_SECONDARY "time.nist.gov"
#define NTP_SYNC_TIMEOUT_MS 15000UL

// ---------------------------------------------------------------------------
// Eco-puntos otorgados por material clasificado correctamente
// ---------------------------------------------------------------------------

#define ECO_POINTS_PLASTIC 10
#define ECO_POINTS_GLASS 10
#define ECO_POINTS_REJECT 2

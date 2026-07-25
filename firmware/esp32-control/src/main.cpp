/**
 * EcoSort AI - Firmware de control (ESP32-S3)
 *
 * Recibe clasificaciones del modulo de vision por UART, rutea el residuo con
 * los servos y reporta cada evento a las Edge Functions de Supabase. Sin red
 * sigue clasificando y guarda los eventos en NVS hasta poder enviarlos.
 *
 * La logica esta repartida en:
 *   lib/ecosort_core  logica pura, probada en el PC (`pio test -e native`)
 *   src/app           maquina de estados
 *   src/net           WiFi, cliente HTTPS y cola de envio
 *   src/io            servos, sensores y UART
 *   src/ui            pantalla (Serial por defecto, ILI9341 opcional)
 *
 * Credenciales: copiar include/secrets.h.example a include/secrets.h.
 */
#include <Arduino.h>

#include "app/state_machine.h"
#include "config.h"

namespace {
ecosort::StateMachine machine;
}

void setup() {
  Serial.begin(115200);
  // El USB CDC del S3 tarda un instante en enumerar; sin esto se pierden las
  // primeras trazas del arranque.
  const uint32_t startedMs = millis();
  while (!Serial && millis() - startedMs < 2000) delay(10);

  Serial.printf("\nEcoSort AI - firmware %s (%s)\n", ECOSORT_FIRMWARE_VERSION, __DATE__);
  machine.begin();
}

void loop() {
  machine.loop();
  // Cede tiempo al stack de WiFi; el resto del firmware no bloquea.
  delay(5);
}

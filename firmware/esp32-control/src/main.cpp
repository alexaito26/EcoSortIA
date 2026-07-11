// EcoSort AI - Firmware de control ESP32
//
// STUB - La logica real se implementa en la Fase 6:
//   - Conexion WiFi y HTTPS hacia las Edge Functions de Supabase.
//   - Comunicacion UART con el modulo de vision/clasificacion.
//   - Control de servo para el ruteo del residuo.
//   - Lectura de sensores (nivel de contenedor, etc.).
//   - Pantalla TFT desacoplada.
//   - Maquina de estados + cola offline + reintentos.
//
// No colocar secretos (WiFi, tokens) en el codigo fuente.

#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  Serial.println("EcoSort AI ESP32 - stub (Fase 6)");
}

void loop() {
  delay(1000);
}

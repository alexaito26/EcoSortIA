#pragma once

#include <Arduino.h>

#include "ecosort/model.h"

namespace ecosort {

/**
 * Pantalla del dispositivo, desacoplada del resto del firmware.
 *
 * La logica de control nunca habla con TFT_eSPI: habla con esta interfaz.
 * Asi el equipo puede trabajar y depurar sin pantalla conectada, y cambiar
 * de panel sin tocar la maquina de estados.
 *
 * Implementaciones:
 *   - SerialDisplay: por defecto, escribe en el monitor serie.
 *   - TftDisplay:    ILI9341, solo cuando se compila con -D ECOSORT_USE_TFT.
 */
class Display {
 public:
  virtual ~Display() = default;

  virtual void begin() {}

  /** Estado general del dispositivo (una linea, siempre visible). */
  virtual void showStatus(const char* state, const char* detail) = 0;

  /** Resultado de la ultima clasificacion. */
  virtual void showClassification(Material material, float confidence) = 0;

  /** Niveles de llenado de los contenedores. */
  virtual void showLevels(const BinLevels& levels) = 0;

  /** Conectividad: WiFi, eventos pendientes en la cola offline. */
  virtual void showConnectivity(bool online, int rssi, size_t pendingEvents) = 0;

  /** Mensaje de error visible para el operador. */
  virtual void showError(const char* message) = 0;
};

/**
 * Devuelve la pantalla activa segun los flags de compilacion.
 * Sin -D ECOSORT_USE_TFT devuelve la implementacion por Serial.
 */
Display& activeDisplay();

}  // namespace ecosort

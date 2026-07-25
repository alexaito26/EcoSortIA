#pragma once

#include <Arduino.h>

#include "ecosort/model.h"

namespace ecosort {

/**
 * Enlace UART con el modulo de vision.
 *
 * Lee lineas terminadas en '\n' sin bloquear el loop y las entrega ya
 * validadas. Las lineas corruptas o demasiado largas se descartan y se
 * contabilizan como error de protocolo.
 */
class VisionUart {
 public:
  void begin();

  /**
   * Comprueba si llego una clasificacion completa.
   * Devuelve un resultado con `valid = true` como maximo una vez por linea.
   */
  bool poll(VisionResult& out);

  /** Lineas descartadas por formato invalido desde el arranque. */
  uint32_t protocolErrors() const { return protocolErrors_; }

  /** Milisegundos desde la ultima linea valida (UINT32_MAX si nunca hubo). */
  uint32_t millisSinceLastMessage() const;

 private:
  String buffer_;
  uint32_t protocolErrors_ = 0;
  uint32_t lastMessageMs_ = 0;
  bool everReceived_ = false;
};

}  // namespace ecosort

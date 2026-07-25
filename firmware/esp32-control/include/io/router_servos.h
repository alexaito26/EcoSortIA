#pragma once

#include <Arduino.h>
#include <ESP32Servo.h>

#include "ecosort/model.h"

namespace ecosort {

/**
 * Ruteo mecanico del residuo con dos servos.
 *
 * Secuencia: girar la tolva al contenedor -> esperar a que asiente ->
 * abrir compuerta -> cerrar -> volver a la posicion de reposo.
 *
 * El ciclo es no bloqueante (avanza por pasos en `loop()`) para que el
 * firmware siga atendiendo red, sensores y pantalla mientras el servo se
 * mueve.
 */
class RouterServos {
 public:
  void begin();

  /** Inicia el ciclo de ruteo. Ignorado si ya hay uno en curso. */
  bool startRouting(Material material);

  /** Avanza la secuencia. Llamar en cada iteracion del loop. */
  void loop();

  bool isBusy() const { return phase_ != Phase::Idle; }

  /** true cuando el ciclo termino desde la ultima consulta. */
  bool takeCompleted();

  /** Coloca ambos servos en reposo (arranque y recuperacion de errores). */
  void home();

  static int angleFor(Material material);

 private:
  enum class Phase : uint8_t { Idle, Rotating, Opening, Closing, Returning };

  void enter(Phase phase, uint32_t durationMs);

  Servo rotation_;
  Servo gate_;
  Phase phase_ = Phase::Idle;
  uint32_t phaseEndsAtMs_ = 0;
  bool completed_ = false;
};

}  // namespace ecosort

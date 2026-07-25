#pragma once

#include <Arduino.h>

#include "ecosort/model.h"

namespace ecosort {

/**
 * Nivel de llenado de los tres contenedores con sensores HC-SR04.
 *
 * Mide la distancia del sensor (en la tapa) a la superficie del residuo y la
 * traduce a porcentaje. Cada contenedor promedia varias muestras porque un
 * eco perdido o una bolsa arrugada dan lecturas erraticas.
 */
class LevelSensors {
 public:
  void begin();

  /** Lee los tres contenedores. Bloquea unos milisegundos por sensor. */
  BinLevels read();

  /** Ultimos niveles conocidos, sin volver a medir. */
  const BinLevels& lastLevels() const { return last_; }

  /** true si algun sensor no devolvio ninguna lectura valida. */
  bool hasSensorFault() const { return fault_; }

  /** Nombre del contenedor cuyo sensor fallo (cadena vacia si no hay fallo). */
  const char* faultDetail() const { return faultDetail_; }

 private:
  int readBinLevel(uint8_t trigPin, uint8_t echoPin);
  float measureDistanceCm(uint8_t trigPin, uint8_t echoPin);

  BinLevels last_;
  bool fault_ = false;
  const char* faultDetail_ = "";
};

}  // namespace ecosort

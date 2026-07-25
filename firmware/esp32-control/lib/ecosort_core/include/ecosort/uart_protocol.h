#pragma once

#include <string>

#include "ecosort/model.h"

namespace ecosort {

/**
 * Protocolo UART con el ESP32-S3 de vision.
 *
 * El modulo de IA envia una linea JSON por clasificacion:
 *   {"material":"plastic","confidence":0.93,"processing_time_ms":1480,
 *    "model_version":"yolov8n-v3"}
 *
 * El parser es deliberadamente estricto: una linea corrupta por ruido
 * electrico no debe generar una clasificacion inventada en la base de datos.
 */

/** Longitud maxima aceptada de una linea UART (defensa ante ruido). */
constexpr std::size_t kMaxUartLine = 512;

/**
 * Interpreta una linea del modulo de vision.
 * `valid` es false si el JSON es invalido, falta un campo obligatorio,
 * el material no existe o la confianza esta fuera de [0, 1].
 */
VisionResult parseVisionLine(const std::string& line);

}  // namespace ecosort

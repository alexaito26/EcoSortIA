#pragma once

#include <cstdint>
#include <string>

/**
 * Modelo de dominio del dispositivo EcoSort.
 *
 * Refleja el contrato de docs/api-contract.md. Vive en la libreria `core`
 * (sin dependencias de Arduino) para poder probarse en el PC con el entorno
 * `native` de PlatformIO.
 */
namespace ecosort {

/** Materiales aceptados por la Edge Function (enum waste_category). */
enum class Material : uint8_t { Plastic, Glass, Reject, Unknown };

/** Tipos de evento aceptados por ingest-device-event. */
enum class EventType : uint8_t {
  ClassificationCompleted,
  ClassificationRejected,
  RoutingError,
  SensorError,
  SystemError,
};

const char* toString(Material material);
const char* toString(EventType type);

/** Devuelve Material::Unknown si el texto no es un material valido. */
Material materialFromString(const char* text);

/** Sentinela para "sin lectura disponible" en los niveles de contenedor. */
constexpr int kNoLevel = -1;

/** Niveles de llenado 0-100 por contenedor. */
struct BinLevels {
  int plastic = kNoLevel;
  int glass = kNoLevel;
  int reject = kNoLevel;

  bool any() const {
    return plastic != kNoLevel || glass != kNoLevel || reject != kNoLevel;
  }
};

/** Resultado de una clasificacion recibida del modulo de vision por UART. */
struct VisionResult {
  bool valid = false;
  Material material = Material::Unknown;
  float confidence = 0.0f;
  int processingTimeMs = 0;
  std::string modelVersion;
};

/** Evento listo para enviarse a ingest-device-event. */
struct DeviceEvent {
  std::string eventId;
  EventType type = EventType::SystemError;
  std::string occurredAt;  // ISO 8601 con offset

  Material material = Material::Unknown;
  bool hasMaterial = false;

  float confidence = 0.0f;
  bool hasConfidence = false;

  bool routingSuccess = true;
  bool hasRoutingSuccess = false;

  int processingTimeMs = kNoLevel;
  int ecoPoints = kNoLevel;
  int servoTarget = kNoLevel;

  std::string modelVersion;
  std::string firmwareVersion;
  std::string userId;
  std::string message;
  std::string errorCode;

  BinLevels levels;
};

/** Datos de un latido para device-heartbeat. */
struct Heartbeat {
  std::string firmwareVersion;
  std::string modelVersion;
  std::string state;
  int wifiRssi = 0;
  uint32_t uptimeSeconds = 0;
  uint32_t freeHeap = 0;
  BinLevels levels;
};

}  // namespace ecosort

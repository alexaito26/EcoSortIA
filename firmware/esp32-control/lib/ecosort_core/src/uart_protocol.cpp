#include "ecosort/uart_protocol.h"

#include <ArduinoJson.h>

namespace ecosort {

VisionResult parseVisionLine(const std::string& line) {
  VisionResult result;

  if (line.empty() || line.size() > kMaxUartLine) return result;

  JsonDocument doc;
  if (deserializeJson(doc, line) != DeserializationError::Ok) return result;
  if (!doc.is<JsonObject>()) return result;

  JsonVariant material = doc["material"];
  if (!material.is<const char*>()) return result;

  const Material parsed = materialFromString(material.as<const char*>());
  // "unknown" solo se acepta si el modulo lo envio explicitamente; cualquier
  // otro texto desconocido es una linea corrupta.
  if (parsed == Material::Unknown && std::string(material.as<const char*>()) != "unknown") {
    return result;
  }

  JsonVariant confidence = doc["confidence"];
  if (!confidence.is<float>()) return result;
  const float value = confidence.as<float>();
  if (value < 0.0f || value > 1.0f) return result;

  result.valid = true;
  result.material = parsed;
  result.confidence = value;

  JsonVariant processing = doc["processing_time_ms"];
  if (processing.is<int>()) {
    const int ms = processing.as<int>();
    if (ms >= 0) result.processingTimeMs = ms;
  }

  JsonVariant model = doc["model_version"];
  if (model.is<const char*>()) result.modelVersion = model.as<const char*>();

  return result;
}

}  // namespace ecosort

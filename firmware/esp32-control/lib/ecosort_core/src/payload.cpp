#include "ecosort/payload.h"

#include <ArduinoJson.h>

#include <cstdio>
#include <ctime>

namespace ecosort {
namespace {

/** Agrega los niveles de contenedor solo si hay lecturas validas (0-100). */
void addBinLevels(JsonObject parent, const BinLevels& levels) {
  if (!levels.any()) return;
  JsonObject bins = parent["bin_levels"].to<JsonObject>();
  if (levels.plastic != kNoLevel) bins["plastic"] = levels.plastic;
  if (levels.glass != kNoLevel) bins["glass"] = levels.glass;
  if (levels.reject != kNoLevel) bins["reject"] = levels.reject;
}

}  // namespace

std::string buildEventPayload(const DeviceEvent& event, const std::string& deviceCode) {
  JsonDocument doc;
  doc["event_id"] = event.eventId;
  doc["device_code"] = deviceCode;
  doc["event_type"] = toString(event.type);
  doc["occurred_at"] = event.occurredAt;

  JsonObject payload = doc["payload"].to<JsonObject>();
  if (event.hasMaterial) payload["material"] = toString(event.material);
  if (event.hasConfidence) payload["confidence"] = event.confidence;
  if (event.hasRoutingSuccess) payload["routing_success"] = event.routingSuccess;
  if (event.processingTimeMs != kNoLevel) payload["processing_time_ms"] = event.processingTimeMs;
  if (event.ecoPoints != kNoLevel) payload["eco_points"] = event.ecoPoints;
  if (event.servoTarget != kNoLevel) payload["servo_target"] = event.servoTarget;
  if (!event.modelVersion.empty()) payload["model_version"] = event.modelVersion;
  if (!event.firmwareVersion.empty()) payload["firmware_version"] = event.firmwareVersion;
  if (!event.userId.empty()) payload["user_id"] = event.userId;
  if (!event.message.empty()) payload["message"] = event.message;
  if (!event.errorCode.empty()) payload["error_code"] = event.errorCode;
  addBinLevels(payload, event.levels);

  std::string out;
  serializeJson(doc, out);
  return out;
}

std::string buildHeartbeatPayload(const Heartbeat& heartbeat, const std::string& deviceCode) {
  JsonDocument doc;
  doc["device_code"] = deviceCode;
  if (!heartbeat.firmwareVersion.empty()) doc["firmware_version"] = heartbeat.firmwareVersion;
  if (!heartbeat.modelVersion.empty()) doc["model_version"] = heartbeat.modelVersion;
  if (!heartbeat.state.empty()) doc["state"] = heartbeat.state;
  if (heartbeat.wifiRssi != 0) doc["wifi_rssi"] = heartbeat.wifiRssi;
  doc["uptime_seconds"] = heartbeat.uptimeSeconds;
  doc["free_heap"] = heartbeat.freeHeap;
  addBinLevels(doc.as<JsonObject>(), heartbeat.levels);

  std::string out;
  serializeJson(doc, out);
  return out;
}

std::string makeEventId(uint32_t bootId, uint32_t counter) {
  char buffer[40];
  std::snprintf(buffer, sizeof(buffer), "evt-%08x-%08x", bootId, counter);
  return std::string(buffer);
}

std::string formatIso8601Utc(int64_t epochSeconds) {
  std::time_t raw = static_cast<std::time_t>(epochSeconds);
  std::tm parts{};
#if defined(_WIN32)
  gmtime_s(&parts, &raw);
#else
  gmtime_r(&raw, &parts);
#endif

  char buffer[32];
  std::snprintf(buffer, sizeof(buffer), "%04d-%02d-%02dT%02d:%02d:%02dZ", parts.tm_year + 1900,
                parts.tm_mon + 1, parts.tm_mday, parts.tm_hour, parts.tm_min, parts.tm_sec);
  return std::string(buffer);
}

}  // namespace ecosort

#include "net/api_client.h"

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

#include "config.h"
#include "net/root_ca.h"

namespace ecosort {

void ApiClient::begin(const char* baseUrl, const char* anonKey, const char* deviceCode,
                      const char* deviceToken) {
  baseUrl_ = baseUrl;
  anonKey_ = anonKey;
  deviceCode_ = deviceCode;
  deviceToken_ = deviceToken;
}

ApiResult ApiClient::postEvent(const std::string& jsonPayload) {
  return post("/ingest-device-event", jsonPayload);
}

ApiResult ApiClient::postHeartbeat(const std::string& jsonPayload) {
  return post("/device-heartbeat", jsonPayload);
}

ApiResult ApiClient::post(const char* path, const std::string& jsonPayload) {
  ApiResult result;

  WiFiClientSecure client;
#ifdef ECOSORT_TLS_INSECURE
  // Compilacion de depuracion: no validar el certificado del servidor.
  client.setInsecure();
#else
  client.setCACert(kSupabaseRootCa);
#endif
  client.setTimeout(HTTP_TIMEOUT_MS / 1000);

  const String url = String(baseUrl_) + path;

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.setConnectTimeout(HTTP_TIMEOUT_MS);
  // Reintentar lo gestiona el despachador con backoff, no HTTPClient.
  http.setReuse(false);

  if (!http.begin(client, url)) {
    Serial.printf("[api] no se pudo iniciar la peticion a %s\n", path);
    return result;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + anonKey_);
  http.addHeader("x-device-code", deviceCode_);
  http.addHeader("x-device-token", deviceToken_);

  const int status = http.POST(reinterpret_cast<const uint8_t*>(jsonPayload.data()),
                               jsonPayload.size());

  if (status <= 0) {
    Serial.printf("[api] %s fallo de red: %s\n", path, http.errorToString(status).c_str());
    http.end();
    return result;
  }

  result.statusCode = status;
  result.body = http.getString();
  http.end();

  if (result.ok()) {
    JsonDocument doc;
    if (deserializeJson(doc, result.body) == DeserializationError::Ok) {
      result.duplicate = doc["duplicate"].is<bool>() && doc["duplicate"].as<bool>();
    }
  } else {
    // El cuerpo de error puede incluir el token si el backend lo devolviera:
    // se registra solo el codigo y un extracto corto.
    Serial.printf("[api] %s respondio %d: %.120s\n", path, status, result.body.c_str());
  }

  return result;
}

}  // namespace ecosort

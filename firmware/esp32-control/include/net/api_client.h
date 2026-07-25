#pragma once

#include <Arduino.h>

#include <string>

namespace ecosort {

/** Resultado de un POST a una Edge Function. */
struct ApiResult {
  int statusCode = 0;      // 0 = no hubo respuesta (fallo de red)
  bool duplicate = false;  // la Edge Function reconocio el event_id como repetido
  String body;

  /** 2xx: el backend acepto el evento. */
  bool ok() const { return statusCode >= 200 && statusCode < 300; }

  /**
   * true si reintentar puede funcionar (fallo de red o error del servidor).
   * Un 400/401/403 es culpa del payload o del token: reintentarlo solo
   * llenaria la cola con eventos que nunca van a entrar.
   */
  bool retryable() const { return statusCode == 0 || statusCode == 429 || statusCode >= 500; }
};

/**
 * Cliente HTTPS de las Edge Functions de Supabase.
 *
 * Autentica cada peticion con los headers del contrato:
 *   Authorization: Bearer <anon key>
 *   x-device-code / x-device-token
 */
class ApiClient {
 public:
  void begin(const char* baseUrl, const char* anonKey, const char* deviceCode,
             const char* deviceToken);

  ApiResult postEvent(const std::string& jsonPayload);
  ApiResult postHeartbeat(const std::string& jsonPayload);

 private:
  ApiResult post(const char* path, const std::string& jsonPayload);

  const char* baseUrl_ = nullptr;
  const char* anonKey_ = nullptr;
  const char* deviceCode_ = nullptr;
  const char* deviceToken_ = nullptr;
};

}  // namespace ecosort

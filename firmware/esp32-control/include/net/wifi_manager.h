#pragma once

#include <Arduino.h>

namespace ecosort {

/**
 * Conexion WiFi con reconexion no bloqueante y sincronizacion horaria.
 *
 * El resto del firmware nunca se queda esperando a la red: consulta
 * `isConnected()` y sigue clasificando aunque este offline.
 */
class WifiManager {
 public:
  void begin(const char* ssid, const char* password);

  /** Llamar en cada iteracion del loop: gestiona reintentos de conexion. */
  void loop();

  bool isConnected() const;

  /** true cuando la hora se sincronizo por NTP (necesario para occurred_at). */
  bool hasTime() const { return timeSynced_; }

  int rssi() const;
  String ipAddress() const;

 private:
  void startConnection();
  void syncTime();

  const char* ssid_ = nullptr;
  const char* password_ = nullptr;
  bool connecting_ = false;
  bool timeSynced_ = false;
  bool wasConnected_ = false;
  uint32_t attemptStartedMs_ = 0;
  uint32_t lastRetryMs_ = 0;
};

}  // namespace ecosort

#include "net/wifi_manager.h"

#include <WiFi.h>
#include <time.h>

#include "config.h"

namespace ecosort {

void WifiManager::begin(const char* ssid, const char* password) {
  ssid_ = ssid;
  password_ = password;

  WiFi.mode(WIFI_STA);
  // La reconexion la gestiona este manager, no el stack: asi se controla el
  // ritmo de reintentos y se puede reflejar el estado en la pantalla.
  WiFi.setAutoReconnect(false);
  WiFi.persistent(false);
  startConnection();
}

void WifiManager::startConnection() {
  Serial.printf("[wifi] conectando a %s\n", ssid_);
  WiFi.disconnect(true);
  WiFi.begin(ssid_, password_);
  connecting_ = true;
  attemptStartedMs_ = millis();
}

void WifiManager::loop() {
  const bool connected = isConnected();

  if (connected) {
    if (!wasConnected_) {
      Serial.printf("[wifi] conectado, ip=%s rssi=%d\n", ipAddress().c_str(), rssi());
      wasConnected_ = true;
      connecting_ = false;
    }
    if (!timeSynced_) syncTime();
    return;
  }

  if (wasConnected_) {
    Serial.println(F("[wifi] conexion perdida"));
    wasConnected_ = false;
    connecting_ = false;
    lastRetryMs_ = millis();
  }

  const uint32_t now = millis();

  if (connecting_) {
    if (now - attemptStartedMs_ >= WIFI_CONNECT_TIMEOUT_MS) {
      Serial.println(F("[wifi] intento agotado"));
      WiFi.disconnect(true);
      connecting_ = false;
      lastRetryMs_ = now;
    }
    return;
  }

  if (now - lastRetryMs_ >= WIFI_RETRY_INTERVAL_MS) startConnection();
}

void WifiManager::syncTime() {
  static uint32_t startedMs = 0;
  static bool requested = false;

  if (!requested) {
    configTime(0, 0, NTP_SERVER_PRIMARY, NTP_SERVER_SECONDARY);
    startedMs = millis();
    requested = true;
    Serial.println(F("[ntp] sincronizando hora"));
    return;
  }

  // Antes de 2021 la hora es el valor por defecto del RTC, no una hora real.
  if (time(nullptr) > 1609459200) {
    timeSynced_ = true;
    Serial.println(F("[ntp] hora sincronizada"));
    return;
  }

  if (millis() - startedMs >= NTP_SYNC_TIMEOUT_MS) {
    Serial.println(F("[ntp] sin respuesta, se reintenta"));
    requested = false;
  }
}

bool WifiManager::isConnected() const { return WiFi.status() == WL_CONNECTED; }

int WifiManager::rssi() const { return isConnected() ? WiFi.RSSI() : 0; }

String WifiManager::ipAddress() const {
  return isConnected() ? WiFi.localIP().toString() : String("0.0.0.0");
}

}  // namespace ecosort

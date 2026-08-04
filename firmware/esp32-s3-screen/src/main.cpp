#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <TFT_eSPI.h>
#include <qrcode.h>
#include "../../esp32-control/include/net/root_ca.h"
#include "secrets.h"

namespace {
constexpr uint32_t kPollMs = 2500, kWifiRetryMs = 5000, kHttpTimeoutMs = 8000;
constexpr int kButtonY = 278, kButtonH = 34;
TFT_eSPI tft;
String shownId, eventId, state, wasteType, qrContent, rejectionReason;
int points = 0; bool displayed = false; uint32_t nextPoll = 0, nextWifi = 0;
void title(const char* text) { tft.fillScreen(TFT_WHITE); tft.setTextColor(TFT_BLACK, TFT_WHITE); tft.setTextDatum(TL_DATUM); tft.setTextSize(2); tft.drawString(text, 10, 12); }
void button(const char* text) { tft.fillRoundRect(10, kButtonY, 220, kButtonH, 5, TFT_DARKGREEN); tft.setTextColor(TFT_WHITE, TFT_DARKGREEN); tft.setTextDatum(MC_DATUM); tft.setTextSize(1); tft.drawString(text, 120, kButtonY + kButtonH / 2); }
void status(const char* text) { title("EcoSort AI"); tft.setTextColor(TFT_DARKGREY, TFT_WHITE); tft.setTextDatum(TL_DATUM); tft.setTextSize(1); tft.drawString(text, 10, 55); }
bool i2cHealthy() { Wire.begin(); Wire.beginTransmission(0x3C); const uint8_t code = Wire.endTransmission(); return code == 0 || code == 2; }
bool post(const char* path, const String& body, String& response) {
  if (WiFi.status() != WL_CONNECTED) return false;
  WiFiClientSecure client; client.setCACert(ecosort::kSupabaseRootCa); client.setTimeout(kHttpTimeoutMs / 1000);
  HTTPClient http; http.setTimeout(kHttpTimeoutMs); http.setConnectTimeout(kHttpTimeoutMs);
  if (!http.begin(client, String(SUPABASE_FUNCTIONS_URL) + path)) return false;
  http.addHeader("Content-Type", "application/json"); http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  http.addHeader("x-device-code", DEVICE_CODE); http.addHeader("x-device-token", DEVICE_TOKEN);
  const int code = http.POST(body); response = code > 0 ? http.getString() : ""; http.end(); return code >= 200 && code < 300;
}
void ack(const char* value) { String ignored; post("/screen-ack-event", String("{\"event_id\":\"") + eventId + "\",\"status\":\"" + value + "\"}", ignored); }
void drawQr(const String& text) { QRCode code; uint8_t data[qrcode_getBufferSize(4)]; qrcode_initText(&code, data, 4, 0, text.c_str()); const int scale = 3, x = (240 - code.size * scale) / 2, y = 112; tft.fillRect(x - 3, y - 3, code.size * scale + 6, code.size * scale + 6, TFT_WHITE); for (uint8_t yy = 0; yy < code.size; ++yy) for (uint8_t xx = 0; xx < code.size; ++xx) if (qrcode_getModule(&code, xx, yy)) tft.fillRect(x + xx * scale, y + yy * scale, scale, scale, TFT_BLACK); }
void showEvent() {
  title(state == "accepted" ? "Residuo aceptado" : "Residuo rechazado"); tft.setTextSize(1); tft.setTextDatum(TL_DATUM);
  if (state == "accepted") { tft.drawString("Tipo: " + wasteType, 10, 48); tft.drawString("EcoPuntos disponibles: +" + String(points), 10, 68); tft.drawString("Escanea para reclamar EcoPuntos", 10, 88); drawQr(qrContent); button("Finalizar sin reclamar"); }
  else { tft.drawString("No genera EcoPuntos", 10, 58); tft.drawString(rejectionReason, 10, 82); button("Continuar"); }
  if (!displayed) { ack("displayed"); displayed = true; }
}
void pollEvent() { String response; if (!post("/screen-next-event", "{}", response)) return; JsonDocument doc; if (deserializeJson(doc, response) || !doc["has_event"].as<bool>()) { if (shownId.isEmpty()) status("Esperando un residuo..."); return; } JsonObject e = doc["event"]; const String newId = e["id"].as<String>(); if (newId == shownId) return; shownId = eventId = newId; state = e["state"].as<String>(); wasteType = e["waste_type"].as<String>(); points = e["points"].as<int>(); qrContent = e["qr_content"].isNull() ? "" : e["qr_content"].as<String>(); rejectionReason = e["rejection_reason"].isNull() ? "No se pudo clasificar el residuo" : e["rejection_reason"].as<String>(); displayed = false; showEvent(); }
void touch() { uint16_t x, y; if (!tft.getTouch(&x, &y) || y < kButtonY || y > kButtonY + kButtonH || eventId.isEmpty()) return; ack("completed"); shownId = ""; eventId = ""; displayed = false; status("Esperando un residuo..."); }
}
void setup() { Serial.begin(115200); tft.init(); tft.setRotation(0); status("Conectando Wi-Fi..."); if (!i2cHealthy()) Serial.println("[i2c] No se detectó periférico I2C opcional"); WiFi.mode(WIFI_STA); WiFi.begin(WIFI_SSID, WIFI_PASSWORD); }
void loop() { const uint32_t now = millis(); if (WiFi.status() != WL_CONNECTED && now >= nextWifi) { nextWifi = now + kWifiRetryMs; WiFi.disconnect(); WiFi.begin(WIFI_SSID, WIFI_PASSWORD); status("Reconectando Wi-Fi..."); } if (WiFi.status() == WL_CONNECTED && now >= nextPoll) { nextPoll = now + kPollMs; pollEvent(); } touch(); }

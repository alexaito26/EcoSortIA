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
constexpr uint32_t kPollMs = 2500;
constexpr uint32_t kWifiRetryMs = 5000;
constexpr uint32_t kHttpTimeoutMs = 8000;
constexpr int kButtonY = 278;
constexpr int kButtonH = 34;

TFT_eSPI tft;
String eventId;
String state;
String wasteType;
String claimStatus;
String qrContent;
String rejectionReason;
int points = 0;
bool displayed = false;
uint32_t nextPoll = 0;
uint32_t nextWifi = 0;

void title(const char* text) {
  tft.fillScreen(TFT_WHITE);
  tft.setTextColor(TFT_BLACK, TFT_WHITE);
  tft.setTextDatum(TL_DATUM);
  tft.setTextSize(2);
  tft.drawString(text, 10, 12);
}

void button(const char* text) {
  tft.fillRoundRect(10, kButtonY, 220, kButtonH, 5, TFT_DARKGREEN);
  tft.setTextColor(TFT_WHITE, TFT_DARKGREEN);
  tft.setTextDatum(MC_DATUM);
  tft.setTextSize(1);
  tft.drawString(text, 120, kButtonY + kButtonH / 2);
}

void status(const char* text) {
  title("EcoSort AI");
  tft.setTextColor(TFT_DARKGREY, TFT_WHITE);
  tft.setTextDatum(TL_DATUM);
  tft.setTextSize(1);
  tft.drawString(text, 10, 55);
}

bool post(const char* path, const String& body, String& response) {
  if (WiFi.status() != WL_CONNECTED) return false;
  WiFiClientSecure client;
  client.setCACert(ecosort::kSupabaseRootCa);
  client.setTimeout(kHttpTimeoutMs / 1000);
  HTTPClient http;
  http.setTimeout(kHttpTimeoutMs);
  http.setConnectTimeout(kHttpTimeoutMs);
  if (!http.begin(client, String(SUPABASE_FUNCTIONS_URL) + path)) return false;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  http.addHeader("x-device-code", DEVICE_CODE);
  http.addHeader("x-device-token", DEVICE_TOKEN);
  const int code = http.POST(body);
  response = code > 0 ? http.getString() : "";
  http.end();
  return code >= 200 && code < 300;
}

void ack(const char* value) {
  if (eventId.isEmpty()) return;
  String ignored;
  String body = String("{") + char(34) + "event_id" + char(34) + ":" + char(34) +
                eventId + char(34) + "," + char(34) + "status" + char(34) +
                ":" + char(34) + value + char(34) + "}";
  post("/screen-ack-event", body, ignored);
}

void drawQr(const String& text) {
  QRCode code;
  uint8_t data[qrcode_getBufferSize(4)];
  qrcode_initText(&code, data, 4, 0, text.c_str());
  const int scale = 3;
  const int x = (240 - code.size * scale) / 2;
  const int y = 112;
  tft.fillRect(x - 3, y - 3, code.size * scale + 6, code.size * scale + 6, TFT_WHITE);
  for (uint8_t yy = 0; yy < code.size; ++yy) {
    for (uint8_t xx = 0; xx < code.size; ++xx) {
      if (qrcode_getModule(&code, xx, yy)) {
        tft.fillRect(x + xx * scale, y + yy * scale, scale, scale, TFT_BLACK);
      }
    }
  }
}

void showEvent() {
  const bool accepted = state == "accepted";
  const bool canClaim = accepted && claimStatus == "unclaimed" && !qrContent.isEmpty();
  title(accepted ? "Residuo aceptado" : "Residuo rechazado");
  tft.setTextDatum(TL_DATUM);
  tft.setTextSize(1);
  if (accepted) {
    tft.drawString(String("Tipo: ") + wasteType, 10, 48);
    tft.drawString(String("EcoPuntos disponibles: +") + points, 10, 68);
    if (claimStatus == "claimed") {
      tft.drawString("EcoPuntos reclamados", 10, 88);
    } else if (claimStatus == "expired") {
      tft.drawString("QR expirado", 10, 88);
    } else {
      tft.drawString("Escanea el QR para reclamarlos", 10, 88);
    }
    if (canClaim) drawQr(qrContent);
    button(canClaim ? "Finalizar sin reclamar" : "Continuar");
  } else {
    tft.drawString("No genera EcoPuntos", 10, 58);
    tft.drawString(rejectionReason, 10, 82);
    button("Continuar");
  }
  if (!displayed) {
    ack("displayed");
    displayed = true;
  }
}

void pollEvent() {
  String response;
  String body = eventId.isEmpty()
    ? String("{}")
    : String("{") + char(34) + "event_id" + char(34) + ":" + char(34) +
        eventId + char(34) + "}";
  if (!post("/screen-next-event", body, response)) return;

  JsonDocument doc;
  if (deserializeJson(doc, response) || !doc["has_event"].as<bool>()) {
    if (eventId.isEmpty()) status("Esperando un residuo...");
    return;
  }

  JsonObject event = doc["event"].as<JsonObject>();
  const String newId = event["id"].as<String>();
  const String newState = event["state"].as<String>();
  const String newClaimStatus = event["claim_status"].as<String>();
  if (newId.isEmpty()) return;

  const bool newEvent = newId != eventId;
  const bool statusChanged = newClaimStatus != claimStatus;
  if (!newEvent && !statusChanged) return;

  eventId = newId;
  state = newState;
  wasteType = event["waste_type"].as<String>();
  claimStatus = newClaimStatus;
  points = event["points"].as<int>();
  qrContent = event["qr_content"].isNull() ? "" : event["qr_content"].as<String>();
  rejectionReason = event["rejection_reason"].isNull()
    ? "No se pudo clasificar el residuo"
    : event["rejection_reason"].as<String>();
  displayed = !newEvent;
  showEvent();
}

void touch() {
  uint16_t x;
  uint16_t y;
  if (!tft.getTouch(&x, &y) || y < kButtonY || y > kButtonY + kButtonH ||
      eventId.isEmpty()) return;
  String ignored;
  if (post("/screen-ack-event",
           String("{") + char(34) + "event_id" + char(34) + ":" + char(34) +
             eventId + char(34) + "," + char(34) + "status" + char(34) +
             ":" + char(34) + "completed" + char(34) + "}",
           ignored)) {
    eventId = "";
    state = "";
    claimStatus = "";
    qrContent = "";
    displayed = false;
    status("Esperando un residuo...");
  }
}

void setup() {
  Serial.begin(115200);
  tft.init();
  tft.setRotation(0);
  status("Conectando Wi-Fi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void loop() {
  const uint32_t now = millis();
  if (WiFi.status() != WL_CONNECTED && now >= nextWifi) {
    nextWifi = now + kWifiRetryMs;
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    status("Reconectando Wi-Fi...");
  }
  if (WiFi.status() == WL_CONNECTED && now >= nextPoll) {
    nextPoll = now + kPollMs;
    pollEvent();
  }
  touch();
}

/**
 * Pantalla ILI9341. Solo se compila en el entorno `esp32-s3-tft`
 * (-D ECOSORT_USE_TFT). Sin ese flag el firmware no enlaza TFT_eSPI ni
 * depende de que haya panel conectado.
 */
#ifdef ECOSORT_USE_TFT

#include <Arduino.h>
#include <TFT_eSPI.h>

#include "config.h"
#include "ui/display.h"

namespace ecosort {

Display& serialFallbackDisplay();

namespace {

constexpr uint16_t kBackground = TFT_BLACK;
constexpr uint16_t kAccent = 0x2E8B;  // verde EcoSort
constexpr int kRowStatus = 10;
constexpr int kRowClassification = 60;
constexpr int kRowLevels = 130;
constexpr int kRowConnectivity = 200;

class TftDisplay : public Display {
 public:
  void begin() override {
    pinMode(PIN_TFT_BACKLIGHT, OUTPUT);
    digitalWrite(PIN_TFT_BACKLIGHT, HIGH);

    tft_.init();
    tft_.setRotation(1);
    tft_.fillScreen(kBackground);
    tft_.setTextColor(kAccent, kBackground);
    tft_.setTextDatum(TL_DATUM);
    tft_.drawString("EcoSort AI", 10, kRowStatus, 4);
  }

  void showStatus(const char* state, const char* detail) override {
    clearRow(kRowStatus, 44);
    tft_.setTextColor(kAccent, kBackground);
    tft_.drawString(state, 10, kRowStatus, 4);
    if (detail && *detail) {
      tft_.setTextColor(TFT_LIGHTGREY, kBackground);
      tft_.drawString(detail, 10, kRowStatus + 26, 2);
    }
    serialFallbackDisplay().showStatus(state, detail);
  }

  void showClassification(Material material, float confidence) override {
    clearRow(kRowClassification, 60);
    tft_.setTextColor(colorFor(material), kBackground);
    tft_.drawString(toString(material), 10, kRowClassification, 4);

    char buffer[24];
    snprintf(buffer, sizeof(buffer), "confianza %.0f%%", confidence * 100.0f);
    tft_.setTextColor(TFT_LIGHTGREY, kBackground);
    tft_.drawString(buffer, 10, kRowClassification + 30, 2);
  }

  void showLevels(const BinLevels& levels) override {
    clearRow(kRowLevels, 60);
    drawBar("PLA", levels.plastic, kRowLevels);
    drawBar("VID", levels.glass, kRowLevels + 20);
    drawBar("REC", levels.reject, kRowLevels + 40);
  }

  void showConnectivity(bool online, int rssi, size_t pendingEvents) override {
    clearRow(kRowConnectivity, 24);
    char buffer[48];
    snprintf(buffer, sizeof(buffer), "%s  %ddBm  cola:%u", online ? "WiFi OK" : "SIN RED", rssi,
             static_cast<unsigned>(pendingEvents));
    tft_.setTextColor(online ? TFT_GREEN : TFT_ORANGE, kBackground);
    tft_.drawString(buffer, 10, kRowConnectivity, 2);
  }

  void showError(const char* message) override {
    clearRow(kRowClassification, 60);
    tft_.setTextColor(TFT_RED, kBackground);
    tft_.drawString("ERROR", 10, kRowClassification, 4);
    tft_.setTextColor(TFT_LIGHTGREY, kBackground);
    tft_.drawString(message, 10, kRowClassification + 30, 2);
    serialFallbackDisplay().showError(message);
  }

 private:
  void clearRow(int y, int height) { tft_.fillRect(0, y, tft_.width(), height, kBackground); }

  void drawBar(const char* label, int level, int y) {
    tft_.setTextColor(TFT_LIGHTGREY, kBackground);
    tft_.drawString(label, 10, y, 2);
    if (level == kNoLevel) {
      tft_.drawString("--", 60, y, 2);
      return;
    }
    const int width = (tft_.width() - 90) * level / 100;
    tft_.drawRect(60, y + 3, tft_.width() - 90, 10, TFT_DARKGREY);
    tft_.fillRect(60, y + 3, width, 10, level >= BIN_FULL_THRESHOLD_PERCENT ? TFT_RED : kAccent);
  }

  static uint16_t colorFor(Material material) {
    switch (material) {
      case Material::Plastic:
        return TFT_CYAN;
      case Material::Glass:
        return TFT_GREEN;
      case Material::Reject:
        return TFT_ORANGE;
      default:
        return TFT_LIGHTGREY;
    }
  }

  TFT_eSPI tft_;
};

TftDisplay tftDisplay;

}  // namespace

Display& activeDisplay() { return tftDisplay; }

}  // namespace ecosort

#endif  // ECOSORT_USE_TFT

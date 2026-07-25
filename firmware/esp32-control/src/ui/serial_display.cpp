#include <Arduino.h>

#include "ui/display.h"

namespace ecosort {
namespace {

/** Pantalla por defecto: monitor serie. Permite operar sin TFT conectada. */
class SerialDisplay : public Display {
 public:
  void begin() override { Serial.println(F("[ui] salida por Serial")); }

  void showStatus(const char* state, const char* detail) override {
    Serial.printf("[estado] %s%s%s\n", state, (detail && *detail) ? " - " : "",
                  detail ? detail : "");
  }

  void showClassification(Material material, float confidence) override {
    Serial.printf("[clasificacion] %s (%.0f%%)\n", toString(material), confidence * 100.0f);
  }

  void showLevels(const BinLevels& levels) override {
    Serial.printf("[niveles] plastic=%s glass=%s reject=%s\n", format(levels.plastic).c_str(),
                  format(levels.glass).c_str(), format(levels.reject).c_str());
  }

  void showConnectivity(bool online, int rssi, size_t pendingEvents) override {
    Serial.printf("[red] %s rssi=%d pendientes=%u\n", online ? "online" : "OFFLINE", rssi,
                  static_cast<unsigned>(pendingEvents));
  }

  void showError(const char* message) override { Serial.printf("[error] %s\n", message); }

 private:
  static String format(int level) { return level == kNoLevel ? String("--") : String(level) + "%"; }
};

SerialDisplay serialDisplay;

}  // namespace

#ifndef ECOSORT_USE_TFT
Display& activeDisplay() { return serialDisplay; }
#endif

/** Accesible tambien con TFT, para volcar el estado al monitor serie. */
Display& serialFallbackDisplay() { return serialDisplay; }

}  // namespace ecosort

#include "io/level_sensors.h"

#include <algorithm>

#include "config.h"

namespace ecosort {
namespace {

constexpr int kSamplesPerBin = 5;
// Velocidad del sonido: 0.0343 cm/us, ida y vuelta -> se divide entre 2.
constexpr float kCmPerMicrosecond = 0.0343f / 2.0f;

}  // namespace

void LevelSensors::begin() {
  const uint8_t trigPins[] = {PIN_ULTRASONIC_PLASTIC_TRIG, PIN_ULTRASONIC_GLASS_TRIG,
                              PIN_ULTRASONIC_REJECT_TRIG};
  const uint8_t echoPins[] = {PIN_ULTRASONIC_PLASTIC_ECHO, PIN_ULTRASONIC_GLASS_ECHO,
                              PIN_ULTRASONIC_REJECT_ECHO};

  for (uint8_t pin : trigPins) {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, LOW);
  }
  for (uint8_t pin : echoPins) {
    pinMode(pin, INPUT);
  }
}

float LevelSensors::measureDistanceCm(uint8_t trigPin, uint8_t echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(4);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  const unsigned long duration = pulseIn(echoPin, HIGH, ULTRASONIC_TIMEOUT_US);
  if (duration == 0) return -1.0f;  // sin eco

  const float distance = static_cast<float>(duration) * kCmPerMicrosecond;
  if (distance < ULTRASONIC_MIN_VALID_CM || distance > ULTRASONIC_MAX_VALID_CM) return -1.0f;
  return distance;
}

int LevelSensors::readBinLevel(uint8_t trigPin, uint8_t echoPin) {
  float samples[kSamplesPerBin];
  int valid = 0;

  for (int i = 0; i < kSamplesPerBin; ++i) {
    const float distance = measureDistanceCm(trigPin, echoPin);
    if (distance > 0.0f) samples[valid++] = distance;
    delay(15);  // el HC-SR04 necesita respiro entre disparos
  }

  // Con menos de la mitad de muestras validas la medida no es fiable.
  if (valid < kSamplesPerBin / 2 + 1) return kNoLevel;

  // La mediana descarta ecos espurios mejor que la media.
  std::sort(samples, samples + valid);
  const float distance = samples[valid / 2];

  const float span = BIN_DISTANCE_EMPTY_CM - BIN_DISTANCE_FULL_CM;
  const float filled = (BIN_DISTANCE_EMPTY_CM - distance) / span * 100.0f;
  return static_cast<int>(std::min(100.0f, std::max(0.0f, filled)) + 0.5f);
}

BinLevels LevelSensors::read() {
  BinLevels levels;
  levels.plastic = readBinLevel(PIN_ULTRASONIC_PLASTIC_TRIG, PIN_ULTRASONIC_PLASTIC_ECHO);
  levels.glass = readBinLevel(PIN_ULTRASONIC_GLASS_TRIG, PIN_ULTRASONIC_GLASS_ECHO);
  levels.reject = readBinLevel(PIN_ULTRASONIC_REJECT_TRIG, PIN_ULTRASONIC_REJECT_ECHO);

  fault_ = false;
  faultDetail_ = "";
  if (levels.plastic == kNoLevel) {
    fault_ = true;
    faultDetail_ = "sensor de plastico sin lectura";
  } else if (levels.glass == kNoLevel) {
    fault_ = true;
    faultDetail_ = "sensor de vidrio sin lectura";
  } else if (levels.reject == kNoLevel) {
    fault_ = true;
    faultDetail_ = "sensor de rechazo sin lectura";
  }

  last_ = levels;
  return levels;
}

}  // namespace ecosort

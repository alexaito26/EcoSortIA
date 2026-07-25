#include "io/router_servos.h"

#include "config.h"

namespace ecosort {

void RouterServos::begin() {
  // ESP32Servo necesita temporizadores LEDC asignados explicitamente.
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);

  rotation_.setPeriodHertz(50);
  gate_.setPeriodHertz(50);
  rotation_.attach(PIN_SERVO_ROTATION, 500, 2400);
  gate_.attach(PIN_SERVO_GATE, 500, 2400);

  home();
}

void RouterServos::home() {
  rotation_.write(SERVO_ANGLE_HOME);
  gate_.write(SERVO_GATE_CLOSED);
  phase_ = Phase::Idle;
}

int RouterServos::angleFor(Material material) {
  switch (material) {
    case Material::Plastic:
      return SERVO_ANGLE_PLASTIC;
    case Material::Glass:
      return SERVO_ANGLE_GLASS;
    case Material::Reject:
    case Material::Unknown:
    default:
      // Lo no identificado va a rechazo: nunca se contamina un reciclable.
      return SERVO_ANGLE_REJECT;
  }
}

bool RouterServos::startRouting(Material material) {
  if (isBusy()) return false;

  rotation_.write(angleFor(material));
  enter(Phase::Rotating, SERVO_ROTATION_SETTLE_MS);
  return true;
}

void RouterServos::enter(Phase phase, uint32_t durationMs) {
  phase_ = phase;
  phaseEndsAtMs_ = millis() + durationMs;
}

void RouterServos::loop() {
  if (phase_ == Phase::Idle) return;
  if (static_cast<int32_t>(millis() - phaseEndsAtMs_) < 0) return;

  switch (phase_) {
    case Phase::Rotating:
      gate_.write(SERVO_GATE_OPEN);
      enter(Phase::Opening, SERVO_GATE_OPEN_MS);
      break;

    case Phase::Opening:
      gate_.write(SERVO_GATE_CLOSED);
      enter(Phase::Closing, SERVO_GATE_CLOSE_MS);
      break;

    case Phase::Closing:
      rotation_.write(SERVO_ANGLE_HOME);
      enter(Phase::Returning, SERVO_ROTATION_SETTLE_MS);
      break;

    case Phase::Returning:
      phase_ = Phase::Idle;
      completed_ = true;
      break;

    case Phase::Idle:
      break;
  }
}

bool RouterServos::takeCompleted() {
  const bool value = completed_;
  completed_ = false;
  return value;
}

}  // namespace ecosort

#pragma once

#include <Arduino.h>

#include "ecosort/model.h"
#include "io/level_sensors.h"
#include "io/router_servos.h"
#include "io/vision_uart.h"
#include "net/api_client.h"
#include "net/event_dispatcher.h"
#include "net/wifi_manager.h"
#include "ui/display.h"

namespace ecosort {

/**
 * Maquina de estados del clasificador.
 *
 *   BOOT -> CONNECTING -> READY -> CLASSIFYING -> ROUTING -> REPORTING -> READY
 *                           ^                                              |
 *                           +----------------- ERROR <---------------------+
 *
 * Regla de diseño: la falta de red NUNCA detiene la clasificacion. Si no hay
 * WiFi el dispositivo sigue clasificando y ruteando, y los eventos esperan en
 * la cola offline. Solo un fallo mecanico o de sensores lleva a ERROR.
 */
class StateMachine {
 public:
  enum class State : uint8_t { Boot, Connecting, Ready, Classifying, Routing, Reporting, Error };

  void begin();
  void loop();

  State state() const { return state_; }
  static const char* toString(State state);

 private:
  void transitionTo(State next, const char* detail = "");
  void handleVisionResult(const VisionResult& result);
  void finishRouting();
  void updateSensors();
  void sendHeartbeatIfDue();
  void reportError(EventType type, const char* code, const char* message);
  int ecoPointsFor(Material material) const;

  WifiManager wifi_;
  ApiClient api_;
  EventDispatcher dispatcher_;
  VisionUart vision_;
  RouterServos servos_;
  LevelSensors sensors_;
  Display* display_ = nullptr;

  State state_ = State::Boot;
  VisionResult pending_;
  Material routedMaterial_ = Material::Unknown;
  bool routedBelowThreshold_ = false;
  uint32_t routingStartedMs_ = 0;
  uint32_t lastHeartbeatMs_ = 0;
  uint32_t lastSensorReadMs_ = 0;
  uint32_t lastConnectivityDrawMs_ = 0;
  bool sensorFaultReported_ = false;
};

}  // namespace ecosort

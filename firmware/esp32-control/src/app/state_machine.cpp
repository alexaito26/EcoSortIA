#include "app/state_machine.h"

#include "config.h"
#include "secrets.h"

namespace ecosort {

const char* StateMachine::toString(State state) {
  switch (state) {
    case State::Boot:
      return "BOOT";
    case State::Connecting:
      return "CONNECTING";
    case State::Ready:
      return "READY";
    case State::Classifying:
      return "CLASSIFYING";
    case State::Routing:
      return "ROUTING";
    case State::Reporting:
      return "REPORTING";
    case State::Error:
    default:
      return "ERROR";
  }
}

void StateMachine::begin() {
  display_ = &activeDisplay();
  display_->begin();
  display_->showStatus(toString(State::Boot), "iniciando");

  pinMode(PIN_STATUS_LED, OUTPUT);
  digitalWrite(PIN_STATUS_LED, LOW);

  servos_.begin();
  sensors_.begin();
  vision_.begin();

  api_.begin(SUPABASE_FUNCTIONS_URL, SUPABASE_ANON_KEY, DEVICE_CODE, DEVICE_TOKEN);
  dispatcher_.begin(&api_, DEVICE_CODE);

  wifi_.begin(WIFI_SSID, WIFI_PASSWORD);
  transitionTo(State::Connecting, "buscando WiFi");
}

void StateMachine::transitionTo(State next, const char* detail) {
  if (state_ == next) return;
  state_ = next;
  Serial.printf("[fsm] -> %s %s\n", toString(next), detail);
  if (display_ != nullptr) display_->showStatus(toString(next), detail);
  digitalWrite(PIN_STATUS_LED, next == State::Ready ? HIGH : LOW);
}

void StateMachine::loop() {
  wifi_.loop();
  servos_.loop();

  const bool online = wifi_.isConnected();
  // La cola se vacia en cualquier estado: reportar no debe esperar a que
  // termine el ciclo mecanico en curso.
  dispatcher_.loop(online && wifi_.hasTime());

  switch (state_) {
    case State::Connecting:
      // Sin red se pasa igualmente a READY: clasificar es la funcion critica,
      // y los eventos quedan en la cola hasta que vuelva la conexion.
      if (online) {
        transitionTo(State::Ready, wifi_.hasTime() ? "conectado" : "sincronizando hora");
      } else if (millis() > WIFI_CONNECT_TIMEOUT_MS) {
        transitionTo(State::Ready, "sin red, modo offline");
      }
      break;

    case State::Ready: {
      VisionResult result;
      if (vision_.poll(result)) {
        transitionTo(State::Classifying, ::ecosort::toString(result.material));
        handleVisionResult(result);
      }
      break;
    }

    case State::Routing:
      if (servos_.takeCompleted()) finishRouting();
      break;

    case State::Error:
      // Se sale del error cuando los sensores vuelven a dar lecturas validas.
      if (!sensors_.hasSensorFault()) {
        servos_.home();
        sensorFaultReported_ = false;
        transitionTo(State::Ready, "recuperado");
      }
      break;

    case State::Boot:
    case State::Classifying:
    case State::Reporting:
      break;
  }

  updateSensors();
  sendHeartbeatIfDue();

  if (display_ != nullptr && millis() - lastConnectivityDrawMs_ >= 2000) {
    lastConnectivityDrawMs_ = millis();
    display_->showConnectivity(online, wifi_.rssi(), dispatcher_.pendingCount());
  }
}

void StateMachine::handleVisionResult(const VisionResult& result) {
  pending_ = result;
  routedBelowThreshold_ = result.confidence < VISION_MIN_CONFIDENCE;

  // Baja confianza o material desconocido -> rechazo. Preferimos mandar un
  // reciclable a rechazo antes que contaminar un contenedor limpio.
  routedMaterial_ = (routedBelowThreshold_ || result.material == Material::Unknown)
                        ? Material::Reject
                        : result.material;

  if (display_ != nullptr) display_->showClassification(result.material, result.confidence);

  routingStartedMs_ = millis();
  if (!servos_.startRouting(routedMaterial_)) {
    reportError(EventType::RoutingError, "SERVO_BUSY", "servo ocupado al iniciar el ruteo");
    return;
  }

  transitionTo(State::Routing, ::ecosort::toString(routedMaterial_));
}

void StateMachine::finishRouting() {
  transitionTo(State::Reporting, "");

  DeviceEvent event;
  event.type = routedBelowThreshold_ ? EventType::ClassificationRejected
                                     : EventType::ClassificationCompleted;
  event.material = routedMaterial_;
  event.hasMaterial = true;
  event.confidence = pending_.confidence;
  event.hasConfidence = true;
  event.routingSuccess = true;
  event.hasRoutingSuccess = true;
  event.servoTarget = RouterServos::angleFor(routedMaterial_);
  event.modelVersion = pending_.modelVersion;
  event.levels = sensors_.lastLevels();

  // Tiempo del modulo de vision si lo reporto; si no, el del ciclo completo.
  event.processingTimeMs = pending_.processingTimeMs > 0
                               ? pending_.processingTimeMs
                               : static_cast<int>(millis() - routingStartedMs_);

  if (!routedBelowThreshold_) {
    event.ecoPoints = ecoPointsFor(routedMaterial_);
  } else {
    event.message = "confianza por debajo del umbral";
  }

  dispatcher_.enqueue(event);
  transitionTo(State::Ready, "");
}

int StateMachine::ecoPointsFor(Material material) const {
  switch (material) {
    case Material::Plastic:
      return ECO_POINTS_PLASTIC;
    case Material::Glass:
      return ECO_POINTS_GLASS;
    case Material::Reject:
      return ECO_POINTS_REJECT;
    default:
      return 0;
  }
}

void StateMachine::updateSensors() {
  if (millis() - lastSensorReadMs_ < SENSOR_READ_INTERVAL_MS) return;
  // Medir mientras los servos se mueven daria lecturas con vibracion.
  if (servos_.isBusy()) return;

  lastSensorReadMs_ = millis();
  const BinLevels levels = sensors_.read();
  if (display_ != nullptr) display_->showLevels(levels);

  if (sensors_.hasSensorFault()) {
    if (!sensorFaultReported_) {
      sensorFaultReported_ = true;
      reportError(EventType::SensorError, "ULTRASONIC_NO_ECHO", sensors_.faultDetail());
    }
    return;
  }

  sensorFaultReported_ = false;
}

void StateMachine::sendHeartbeatIfDue() {
  if (millis() - lastHeartbeatMs_ < HEARTBEAT_INTERVAL_MS) return;
  if (!wifi_.isConnected()) return;

  lastHeartbeatMs_ = millis();

  Heartbeat beat;
  beat.firmwareVersion = ECOSORT_FIRMWARE_VERSION;
  beat.modelVersion = pending_.modelVersion;
  beat.state = toString(state_);
  beat.wifiRssi = wifi_.rssi();
  beat.uptimeSeconds = millis() / 1000;
  beat.freeHeap = ESP.getFreeHeap();
  beat.levels = sensors_.lastLevels();

  if (!dispatcher_.sendHeartbeat(beat)) Serial.println(F("[latido] no entregado"));
}

void StateMachine::reportError(EventType type, const char* code, const char* message) {
  Serial.printf("[fallo] %s: %s\n", code, message);
  if (display_ != nullptr) display_->showError(message);

  DeviceEvent event;
  event.type = type;
  event.errorCode = code;
  event.message = message;
  event.hasRoutingSuccess = type == EventType::RoutingError;
  event.routingSuccess = false;
  event.levels = sensors_.lastLevels();
  dispatcher_.enqueue(event);

  transitionTo(State::Error, code);
}

}  // namespace ecosort

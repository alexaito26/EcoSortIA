#include "net/event_dispatcher.h"

#include <Preferences.h>
#include <esp_random.h>
#include <time.h>

#include "config.h"
#include "ecosort/payload.h"

namespace ecosort {

EventDispatcher::EventDispatcher()
    : queue_(EVENT_QUEUE_CAPACITY), backoff_(RETRY_BASE_DELAY_MS, RETRY_MAX_DELAY_MS) {}

void EventDispatcher::begin(ApiClient* api, const char* deviceCode) {
  api_ = api;
  deviceCode_ = deviceCode;
  // Identificador de arranque: garantiza que tras un reinicio los event_id
  // no colisionen con los de la sesion anterior.
  bootId_ = esp_random();
  restore();
  Serial.printf("[cola] %u eventos pendientes recuperados\n",
                static_cast<unsigned>(queue_.size()));
}

void EventDispatcher::enqueue(DeviceEvent& event) {
  if (event.eventId.empty()) {
    event.eventId = makeEventId(bootId_, ++sequence_);
  }
  if (event.occurredAt.empty()) {
    event.occurredAt = formatIso8601Utc(static_cast<int64_t>(time(nullptr)));
  }
  if (event.firmwareVersion.empty()) {
    event.firmwareVersion = ECOSORT_FIRMWARE_VERSION;
  }

  const std::string payload = buildEventPayload(event, deviceCode_);
  if (!queue_.push(payload)) {
    Serial.println(F("[cola] llena: se descarto el evento mas antiguo"));
  }
  dirty_ = true;
  persist();

  // Un evento nuevo merece un intento inmediato aunque el backoff este alto:
  // lo habitual es que la red ya se haya recuperado.
  nextAttemptMs_ = millis();
}

bool EventDispatcher::sendHeartbeat(const Heartbeat& heartbeat) {
  if (api_ == nullptr) return false;
  const ApiResult result = api_->postHeartbeat(buildHeartbeatPayload(heartbeat, deviceCode_));
  return result.ok();
}

void EventDispatcher::loop(bool online) {
  if (!online || api_ == nullptr || queue_.empty()) return;

  const uint32_t now = millis();
  if (static_cast<int32_t>(now - nextAttemptMs_) < 0) return;

  const ApiResult result = api_->postEvent(queue_.front());

  if (result.ok()) {
    if (result.duplicate) {
      Serial.println(F("[cola] el backend ya tenia el evento (duplicado)"));
    }
    queue_.pop();
    dirty_ = true;
    persist();
    backoff_.reset();
    // Encadena el siguiente sin esperar: vaciar la cola rapido tras reconectar.
    nextAttemptMs_ = now;
    return;
  }

  if (!result.retryable()) {
    // 4xx: el evento nunca sera aceptado (payload o token invalidos).
    // Mantenerlo bloquearia la cola entera.
    Serial.printf("[cola] evento rechazado con %d, se descarta\n", result.statusCode);
    queue_.pop();
    dirty_ = true;
    persist();
    backoff_.reset();
    nextAttemptMs_ = now;
    return;
  }

  const uint32_t delay = backoff_.nextDelayMs();
  nextAttemptMs_ = now + delay;
  Serial.printf("[cola] reintento %u en %u ms (%u pendientes)\n",
                static_cast<unsigned>(backoff_.attempts()), static_cast<unsigned>(delay),
                static_cast<unsigned>(queue_.size()));
}

void EventDispatcher::persist() {
  if (!dirty_) return;

  Preferences prefs;
  if (!prefs.begin(EVENT_QUEUE_NVS_NAMESPACE, false)) {
    Serial.println(F("[cola] no se pudo abrir NVS"));
    return;
  }

  const std::string blob = queue_.serialize();
  if (blob.empty()) {
    prefs.remove(EVENT_QUEUE_NVS_KEY);
  } else {
    prefs.putBytes(EVENT_QUEUE_NVS_KEY, blob.data(), blob.size());
  }
  prefs.end();
  dirty_ = false;
}

void EventDispatcher::restore() {
  Preferences prefs;
  if (!prefs.begin(EVENT_QUEUE_NVS_NAMESPACE, true)) return;

  const size_t size = prefs.getBytesLength(EVENT_QUEUE_NVS_KEY);
  if (size > 0) {
    std::string blob(size, '\0');
    prefs.getBytes(EVENT_QUEUE_NVS_KEY, &blob[0], size);
    queue_.deserialize(blob);
  }
  prefs.end();
}

}  // namespace ecosort

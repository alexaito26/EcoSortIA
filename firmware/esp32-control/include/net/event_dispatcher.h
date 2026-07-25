#pragma once

#include <Arduino.h>

#include "ecosort/backoff.h"
#include "ecosort/event_queue.h"
#include "ecosort/model.h"
#include "net/api_client.h"

namespace ecosort {

/**
 * Entrega de eventos al backend con cola offline persistente.
 *
 * Todo evento se encola primero y se envia despues. Si no hay red, sobrevive
 * en NVS a un corte de luz y se envia al reconectar. Como el `event_id` se
 * genera al crear el evento (no al enviarlo), un reintento tras un timeout
 * ambiguo se deduplica en la Edge Function en vez de duplicar la estadistica.
 */
class EventDispatcher {
 public:
  EventDispatcher();

  /** Carga la cola persistida y prepara el cliente HTTP. */
  void begin(ApiClient* api, const char* deviceCode);

  /** Encola un evento (asigna event_id y occurred_at si faltan). */
  void enqueue(DeviceEvent& event);

  /** Envia el latido. No se encola: un latido viejo no aporta nada. */
  bool sendHeartbeat(const Heartbeat& heartbeat);

  /** Intenta vaciar la cola. Llamar en el loop cuando haya red. */
  void loop(bool online);

  size_t pendingCount() const { return queue_.size(); }
  size_t droppedCount() const { return queue_.droppedCount(); }

  /** Siguiente event_id disponible, util para trazas. */
  uint32_t sequence() const { return sequence_; }

 private:
  void persist();
  void restore();

  EventQueue queue_;
  Backoff backoff_;
  ApiClient* api_ = nullptr;
  const char* deviceCode_ = nullptr;
  uint32_t bootId_ = 0;
  uint32_t sequence_ = 0;
  uint32_t nextAttemptMs_ = 0;
  bool dirty_ = false;
};

}  // namespace ecosort

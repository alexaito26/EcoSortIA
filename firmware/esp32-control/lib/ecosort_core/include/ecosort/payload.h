#pragma once

#include <string>

#include "ecosort/model.h"

/**
 * Construccion de los cuerpos JSON que consumen las Edge Functions.
 * Funciones puras: reciben datos y devuelven el JSON exacto a enviar.
 */
namespace ecosort {

/** Cuerpo de POST /ingest-device-event. */
std::string buildEventPayload(const DeviceEvent& event, const std::string& deviceCode);

/** Cuerpo de POST /device-heartbeat. */
std::string buildHeartbeatPayload(const Heartbeat& heartbeat, const std::string& deviceCode);

/**
 * Genera un event_id unico y estable para reintentos.
 * Formato: evt-<bootId>-<contador en hexadecimal>.
 * El bootId cambia en cada arranque, asi que un reinicio nunca reutiliza ids.
 */
std::string makeEventId(uint32_t bootId, uint32_t counter);

/** Formatea un instante UTC como ISO 8601 (2026-07-11T18:30:00Z). */
std::string formatIso8601Utc(int64_t epochSeconds);

}  // namespace ecosort

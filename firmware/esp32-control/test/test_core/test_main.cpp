/**
 * Pruebas de la logica pura del firmware (entorno `native`, sin hardware).
 *
 *   pio test -e native
 *
 * Cubren lo que puede romper la integridad de los datos en Supabase: parseo
 * del UART, construccion de payloads, idempotencia de event_id, cola offline
 * y backoff de reintentos.
 */
#include <unity.h>

#include <cstring>
#include <string>

#include "ecosort/backoff.h"
#include "ecosort/event_queue.h"
#include "ecosort/payload.h"
#include "ecosort/uart_protocol.h"

using namespace ecosort;

void setUp() {}
void tearDown() {}

// --------------------------------------------------------------------------
// Modelo
// --------------------------------------------------------------------------

void test_material_roundtrip() {
  TEST_ASSERT_EQUAL_STRING("plastic", toString(Material::Plastic));
  TEST_ASSERT_EQUAL_STRING("glass", toString(Material::Glass));
  TEST_ASSERT_EQUAL_STRING("reject", toString(Material::Reject));
  TEST_ASSERT_EQUAL_STRING("unknown", toString(Material::Unknown));

  TEST_ASSERT_TRUE(materialFromString("plastic") == Material::Plastic);
  TEST_ASSERT_TRUE(materialFromString("metal") == Material::Unknown);
  TEST_ASSERT_TRUE(materialFromString(nullptr) == Material::Unknown);
}

void test_event_type_strings_match_contract() {
  TEST_ASSERT_EQUAL_STRING("classification_completed",
                           toString(EventType::ClassificationCompleted));
  TEST_ASSERT_EQUAL_STRING("classification_rejected", toString(EventType::ClassificationRejected));
  TEST_ASSERT_EQUAL_STRING("routing_error", toString(EventType::RoutingError));
  TEST_ASSERT_EQUAL_STRING("sensor_error", toString(EventType::SensorError));
  TEST_ASSERT_EQUAL_STRING("system_error", toString(EventType::SystemError));
}

// --------------------------------------------------------------------------
// Protocolo UART
// --------------------------------------------------------------------------

void test_uart_parses_valid_line() {
  const VisionResult result = parseVisionLine(
      R"({"material":"plastic","confidence":0.93,"processing_time_ms":1480,)"
      R"("model_version":"yolov8n-v3"})");

  TEST_ASSERT_TRUE(result.valid);
  TEST_ASSERT_TRUE(result.material == Material::Plastic);
  TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.93f, result.confidence);
  TEST_ASSERT_EQUAL_INT(1480, result.processingTimeMs);
  TEST_ASSERT_EQUAL_STRING("yolov8n-v3", result.modelVersion.c_str());
}

void test_uart_rejects_garbage() {
  TEST_ASSERT_FALSE(parseVisionLine("").valid);
  TEST_ASSERT_FALSE(parseVisionLine("ruido電\x01\x02").valid);
  TEST_ASSERT_FALSE(parseVisionLine("{material:plastic}").valid);
  TEST_ASSERT_FALSE(parseVisionLine("[1,2,3]").valid);
}

void test_uart_rejects_invalid_material() {
  TEST_ASSERT_FALSE(parseVisionLine(R"({"material":"metal","confidence":0.9})").valid);
}

void test_uart_accepts_explicit_unknown() {
  const VisionResult result = parseVisionLine(R"({"material":"unknown","confidence":0.2})");
  TEST_ASSERT_TRUE(result.valid);
  TEST_ASSERT_TRUE(result.material == Material::Unknown);
}

void test_uart_rejects_confidence_out_of_range() {
  TEST_ASSERT_FALSE(parseVisionLine(R"({"material":"glass","confidence":-0.1})").valid);
  TEST_ASSERT_FALSE(parseVisionLine(R"({"material":"glass","confidence":1.5})").valid);
}

void test_uart_rejects_missing_confidence() {
  TEST_ASSERT_FALSE(parseVisionLine(R"({"material":"glass"})").valid);
}

void test_uart_rejects_oversized_line() {
  std::string huge = R"({"material":"plastic","confidence":0.9,"pad":")";
  huge.append(kMaxUartLine + 10, 'x');
  huge += R"("})";
  TEST_ASSERT_FALSE(parseVisionLine(huge).valid);
}

// --------------------------------------------------------------------------
// Payloads
// --------------------------------------------------------------------------

void test_event_payload_has_contract_fields() {
  DeviceEvent event;
  event.eventId = "evt-0000000a-0000000b";
  event.type = EventType::ClassificationCompleted;
  event.occurredAt = "2026-07-11T18:30:00Z";
  event.material = Material::Plastic;
  event.hasMaterial = true;
  event.confidence = 0.93f;
  event.hasConfidence = true;
  event.routingSuccess = true;
  event.hasRoutingSuccess = true;
  event.processingTimeMs = 1480;
  event.ecoPoints = 10;
  event.levels.plastic = 42;
  event.levels.glass = 18;

  const std::string json = buildEventPayload(event, "ECOSORT-01");

  TEST_ASSERT_NOT_NULL(strstr(json.c_str(), "\"event_id\":\"evt-0000000a-0000000b\""));
  TEST_ASSERT_NOT_NULL(strstr(json.c_str(), "\"device_code\":\"ECOSORT-01\""));
  TEST_ASSERT_NOT_NULL(strstr(json.c_str(), "\"event_type\":\"classification_completed\""));
  TEST_ASSERT_NOT_NULL(strstr(json.c_str(), "\"material\":\"plastic\""));
  TEST_ASSERT_NOT_NULL(strstr(json.c_str(), "\"routing_success\":true"));
  TEST_ASSERT_NOT_NULL(strstr(json.c_str(), "\"plastic\":42"));
  TEST_ASSERT_NOT_NULL(strstr(json.c_str(), "\"glass\":18"));
  // Sin lectura de rechazo: no debe inventarse un 0.
  TEST_ASSERT_NULL(strstr(json.c_str(), "\"reject\""));
}

void test_event_payload_omits_absent_optionals() {
  DeviceEvent event;
  event.eventId = "evt-1";
  event.type = EventType::SystemError;
  event.occurredAt = "2026-07-11T18:30:00Z";
  event.message = "Fallo general";

  const std::string json = buildEventPayload(event, "ECOSORT-01");

  TEST_ASSERT_NOT_NULL(strstr(json.c_str(), "\"message\":\"Fallo general\""));
  TEST_ASSERT_NULL(strstr(json.c_str(), "\"material\""));
  TEST_ASSERT_NULL(strstr(json.c_str(), "\"confidence\""));
  TEST_ASSERT_NULL(strstr(json.c_str(), "\"bin_levels\""));
}

void test_heartbeat_payload() {
  Heartbeat beat;
  beat.firmwareVersion = "1.0.0";
  beat.modelVersion = "yolov8n-v3";
  beat.state = "READY";
  beat.wifiRssi = -58;
  beat.uptimeSeconds = 3200;
  beat.freeHeap = 180000;
  beat.levels.reject = 5;

  const std::string json = buildHeartbeatPayload(beat, "ECOSORT-01");

  TEST_ASSERT_NOT_NULL(strstr(json.c_str(), "\"device_code\":\"ECOSORT-01\""));
  TEST_ASSERT_NOT_NULL(strstr(json.c_str(), "\"state\":\"READY\""));
  TEST_ASSERT_NOT_NULL(strstr(json.c_str(), "\"wifi_rssi\":-58"));
  TEST_ASSERT_NOT_NULL(strstr(json.c_str(), "\"reject\":5"));
}

void test_event_id_is_unique_and_stable() {
  TEST_ASSERT_EQUAL_STRING("evt-0000002a-00000001", makeEventId(42, 1).c_str());
  // Mismo origen -> mismo id (clave para que un reintento sea duplicado).
  TEST_ASSERT_EQUAL_STRING(makeEventId(7, 3).c_str(), makeEventId(7, 3).c_str());
  // Distinto arranque o contador -> id distinto.
  TEST_ASSERT_TRUE(makeEventId(7, 3) != makeEventId(8, 3));
  TEST_ASSERT_TRUE(makeEventId(7, 3) != makeEventId(7, 4));
}

void test_iso8601_format() {
  TEST_ASSERT_EQUAL_STRING("2026-07-11T18:30:00Z", formatIso8601Utc(1783794600).c_str());
  TEST_ASSERT_EQUAL_STRING("1970-01-01T00:00:00Z", formatIso8601Utc(0).c_str());
}

// --------------------------------------------------------------------------
// Cola offline
// --------------------------------------------------------------------------

void test_queue_is_fifo() {
  EventQueue queue(4);
  queue.push("a");
  queue.push("b");

  TEST_ASSERT_EQUAL_UINT(2, queue.size());
  TEST_ASSERT_EQUAL_STRING("a", queue.front().c_str());
  queue.pop();
  TEST_ASSERT_EQUAL_STRING("b", queue.front().c_str());
  queue.pop();
  TEST_ASSERT_TRUE(queue.empty());
}

void test_queue_drops_oldest_when_full() {
  EventQueue queue(2);
  TEST_ASSERT_TRUE(queue.push("a"));
  TEST_ASSERT_TRUE(queue.push("b"));
  TEST_ASSERT_FALSE(queue.push("c"));  // descarta "a"

  TEST_ASSERT_EQUAL_UINT(2, queue.size());
  TEST_ASSERT_EQUAL_UINT(1, queue.droppedCount());
  TEST_ASSERT_EQUAL_STRING("b", queue.front().c_str());
}

void test_queue_survives_persistence_roundtrip() {
  EventQueue original(8);
  original.push(R"({"event_id":"evt-1","payload":{"material":"plastic"}})");
  original.push("segundo con salto\ny longitud rara");

  EventQueue restored(8);
  restored.deserialize(original.serialize());

  TEST_ASSERT_EQUAL_UINT(original.size(), restored.size());
  TEST_ASSERT_EQUAL_STRING(original.front().c_str(), restored.front().c_str());
  restored.pop();
  TEST_ASSERT_EQUAL_STRING("segundo con salto\ny longitud rara", restored.front().c_str());
}

void test_queue_ignores_corrupt_blob() {
  EventQueue queue(4);
  queue.deserialize("no-es-un-numero\nbasura");
  TEST_ASSERT_TRUE(queue.empty());

  // Longitud mayor que los datos disponibles: se descarta sin desbordar.
  queue.deserialize("99\ncorto");
  TEST_ASSERT_TRUE(queue.empty());
}

void test_queue_empty_front_is_safe() {
  EventQueue queue(2);
  TEST_ASSERT_EQUAL_STRING("", queue.front().c_str());
  queue.pop();  // no debe romper
  TEST_ASSERT_TRUE(queue.empty());
}

// --------------------------------------------------------------------------
// Backoff
// --------------------------------------------------------------------------

void test_backoff_grows_and_caps() {
  Backoff backoff(1000, 8000);
  TEST_ASSERT_EQUAL_UINT32(1000, backoff.nextDelayMs());
  TEST_ASSERT_EQUAL_UINT32(2000, backoff.nextDelayMs());
  TEST_ASSERT_EQUAL_UINT32(4000, backoff.nextDelayMs());
  TEST_ASSERT_EQUAL_UINT32(8000, backoff.nextDelayMs());
  TEST_ASSERT_EQUAL_UINT32(8000, backoff.nextDelayMs());
}

void test_backoff_resets_after_success() {
  Backoff backoff(500, 4000);
  backoff.nextDelayMs();
  backoff.nextDelayMs();
  backoff.reset();
  TEST_ASSERT_EQUAL_UINT32(0, backoff.attempts());
  TEST_ASSERT_EQUAL_UINT32(500, backoff.nextDelayMs());
}

// --------------------------------------------------------------------------

int main(int, char**) {
  UNITY_BEGIN();

  RUN_TEST(test_material_roundtrip);
  RUN_TEST(test_event_type_strings_match_contract);

  RUN_TEST(test_uart_parses_valid_line);
  RUN_TEST(test_uart_rejects_garbage);
  RUN_TEST(test_uart_rejects_invalid_material);
  RUN_TEST(test_uart_accepts_explicit_unknown);
  RUN_TEST(test_uart_rejects_confidence_out_of_range);
  RUN_TEST(test_uart_rejects_missing_confidence);
  RUN_TEST(test_uart_rejects_oversized_line);

  RUN_TEST(test_event_payload_has_contract_fields);
  RUN_TEST(test_event_payload_omits_absent_optionals);
  RUN_TEST(test_heartbeat_payload);
  RUN_TEST(test_event_id_is_unique_and_stable);
  RUN_TEST(test_iso8601_format);

  RUN_TEST(test_queue_is_fifo);
  RUN_TEST(test_queue_drops_oldest_when_full);
  RUN_TEST(test_queue_survives_persistence_roundtrip);
  RUN_TEST(test_queue_ignores_corrupt_blob);
  RUN_TEST(test_queue_empty_front_is_safe);

  RUN_TEST(test_backoff_grows_and_caps);
  RUN_TEST(test_backoff_resets_after_success);

  return UNITY_END();
}

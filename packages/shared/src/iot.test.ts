import { describe, expect, it } from "vitest";
import {
  DEVICE_EVENT_TYPES,
  MAX_EVENT_ID_LENGTH,
  heartbeatSchema,
  ingestEventSchema,
} from "./iot";

function baseEvent(overrides: Record<string, unknown> = {}) {
  return {
    event_id: "evt-20260711-00001",
    device_code: "ECOSORT-01",
    event_type: "classification_completed",
    occurred_at: "2026-07-11T18:30:00-05:00",
    payload: {
      material: "plastic",
      confidence: 0.93,
      routing_success: true,
      eco_points: 10,
      bin_levels: { plastic: 42, glass: 18, reject: 5 },
    },
    ...overrides,
  };
}

describe("ingestEventSchema", () => {
  it("acepta un evento valido de plastico", () => {
    expect(ingestEventSchema.safeParse(baseEvent()).success).toBe(true);
  });

  it("acepta un evento valido de vidrio", () => {
    const ev = baseEvent({ payload: { material: "glass", confidence: 0.88 } });
    expect(ingestEventSchema.safeParse(ev).success).toBe(true);
  });

  it("acepta un evento rechazado con material", () => {
    const ev = baseEvent({
      event_type: "classification_rejected",
      payload: { material: "unknown", confidence: 0.3 },
    });
    expect(ingestEventSchema.safeParse(ev).success).toBe(true);
  });

  it("rechaza material invalido", () => {
    const ev = baseEvent({ payload: { material: "metal", confidence: 0.9 } });
    expect(ingestEventSchema.safeParse(ev).success).toBe(false);
  });

  it("rechaza confidence < 0", () => {
    const ev = baseEvent({ payload: { material: "plastic", confidence: -0.1 } });
    expect(ingestEventSchema.safeParse(ev).success).toBe(false);
  });

  it("rechaza confidence > 1", () => {
    const ev = baseEvent({ payload: { material: "plastic", confidence: 1.5 } });
    expect(ingestEventSchema.safeParse(ev).success).toBe(false);
  });

  it("rechaza nivel de contenedor < 0", () => {
    const ev = baseEvent({
      payload: { material: "plastic", confidence: 0.9, bin_levels: { plastic: -1 } },
    });
    expect(ingestEventSchema.safeParse(ev).success).toBe(false);
  });

  it("rechaza nivel de contenedor > 100", () => {
    const ev = baseEvent({
      payload: { material: "plastic", confidence: 0.9, bin_levels: { plastic: 120 } },
    });
    expect(ingestEventSchema.safeParse(ev).success).toBe(false);
  });

  it("rechaza event_id demasiado largo", () => {
    const ev = baseEvent({ event_id: "e".repeat(MAX_EVENT_ID_LENGTH + 1) });
    expect(ingestEventSchema.safeParse(ev).success).toBe(false);
  });

  it("rechaza event_type no permitido", () => {
    const ev = baseEvent({ event_type: "explosion" });
    expect(ingestEventSchema.safeParse(ev).success).toBe(false);
  });

  it("exige material en classification_completed", () => {
    const ev = baseEvent({ payload: { confidence: 0.9 } });
    expect(ingestEventSchema.safeParse(ev).success).toBe(false);
  });

  it("expone exactamente 5 tipos de evento", () => {
    expect(DEVICE_EVENT_TYPES).toHaveLength(5);
  });
});

describe("heartbeatSchema", () => {
  it("acepta un heartbeat valido", () => {
    const hb = {
      device_code: "ECOSORT-01",
      firmware_version: "1.0.0",
      model_version: "yolov8n-v3",
      state: "READY",
      wifi_rssi: -58,
      uptime_seconds: 3200,
      free_heap: 180000,
      bin_levels: { plastic: 42, glass: 18, reject: 5 },
    };
    expect(heartbeatSchema.safeParse(hb).success).toBe(true);
  });

  it("rechaza un heartbeat sin device_code", () => {
    expect(heartbeatSchema.safeParse({ firmware_version: "1.0.0" }).success).toBe(false);
  });

  it("rechaza wifi_rssi fuera de rango", () => {
    const hb = { device_code: "ECOSORT-01", wifi_rssi: 40 };
    expect(heartbeatSchema.safeParse(hb).success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { USER_ROLES, WASTE_CATEGORIES } from "./enums";
import { deviceEventSchema, userRoleSchema } from "./schemas";

describe("enums", () => {
  it("waste categories coinciden con el hardware", () => {
    expect(WASTE_CATEGORIES).toEqual(["plastic", "glass", "reject", "unknown"]);
  });

  it("incluye los cuatro roles", () => {
    expect(USER_ROLES).toContain("admin");
    expect(USER_ROLES).toContain("operator");
    expect(USER_ROLES).toContain("viewer");
    expect(USER_ROLES).toContain("user");
  });
});

describe("deviceEventSchema", () => {
  const valid = {
    event_id: "00000000-0000-0000-0000-000000000000",
    device_id: "ECOSORT-01",
    type: "classification",
    category: "plastic",
    confidence: 0.9,
    occurred_at: "2026-07-10T14:39:00.000Z",
  };

  it("acepta un evento valido", () => {
    expect(deviceEventSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza una categoria invalida", () => {
    const res = deviceEventSchema.safeParse({ ...valid, category: "metal" });
    expect(res.success).toBe(false);
  });

  it("rechaza event_id no uuid", () => {
    const res = deviceEventSchema.safeParse({ ...valid, event_id: "abc" });
    expect(res.success).toBe(false);
  });

  it("userRoleSchema rechaza roles desconocidos", () => {
    expect(userRoleSchema.safeParse("superadmin").success).toBe(false);
  });
});

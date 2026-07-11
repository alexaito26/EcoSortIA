import { describe, expect, it } from "vitest";
import { redirectPathForRole, ROLE_ACCESS } from "./roles";

describe("redirectPathForRole", () => {
  it("redirige cada rol a su area", () => {
    expect(redirectPathForRole("admin")).toBe("/dashboard");
    expect(redirectPathForRole("operator")).toBe("/monitor");
    expect(redirectPathForRole("viewer")).toBe("/dashboard");
    expect(redirectPathForRole("user")).toBe("/home");
  });
});

describe("ROLE_ACCESS", () => {
  it("el usuario normal no accede a dashboard ni monitor", () => {
    expect(ROLE_ACCESS["/dashboard"]).not.toContain("user");
    expect(ROLE_ACCESS["/monitor"]).not.toContain("user");
  });

  it("solo admin/operator acceden al monitor", () => {
    expect([...ROLE_ACCESS["/monitor"]].sort()).toEqual(["admin", "operator"]);
  });
});

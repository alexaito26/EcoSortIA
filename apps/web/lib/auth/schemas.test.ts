import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./schemas";

describe("registerSchema", () => {
  it("ignora cualquier campo role enviado desde el cliente", () => {
    const parsed = registerSchema.parse({
      full_name: "Ada Lovelace",
      email: "ada@example.com",
      password: "supersecret1",
      confirmPassword: "supersecret1",
      role: "admin",
    });
    expect("role" in parsed).toBe(false);
  });

  it("rechaza contrasenas que no coinciden", () => {
    const res = registerSchema.safeParse({
      full_name: "Ada",
      email: "ada@example.com",
      password: "supersecret1",
      confirmPassword: "otra",
    });
    expect(res.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("rechaza correo invalido", () => {
    expect(loginSchema.safeParse({ email: "x", password: "y" }).success).toBe(false);
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guardas de privacidad del service worker.
 *
 * El cache del navegador no esta protegido por RLS y sobrevive al logout, asi
 * que estas pruebas fallan a proposito si alguien agrega una ruta protegida al
 * middleware y olvida excluirla del service worker.
 */

const APP_ROOT = process.cwd();
const swSource = readFileSync(path.join(APP_ROOT, "public", "sw.js"), "utf8");
const middlewareSource = readFileSync(
  path.join(APP_ROOT, "lib", "supabase", "middleware.ts"),
  "utf8",
);

function extractStringArray(source: string, constName: string): string[] {
  const match = source.match(new RegExp(`${constName}\\s*=\\s*\\[([^\\]]*)\\]`));
  if (!match) throw new Error(`No se encontro ${constName}`);
  return [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

describe("service worker: privacidad", () => {
  it("excluye del cache todas las rutas protegidas del middleware", () => {
    const protectedPrefixes = extractStringArray(middlewareSource, "PROTECTED_PREFIXES");
    const swPrivatePrefixes = extractStringArray(swSource, "PRIVATE_PATH_PREFIXES");

    expect(protectedPrefixes.length).toBeGreaterThan(0);
    for (const prefix of protectedPrefixes) {
      expect(swPrivatePrefixes).toContain(prefix);
    }
  });

  it("tambien excluye las rutas de autenticacion", () => {
    const swPrivatePrefixes = extractStringArray(swSource, "PRIVATE_PATH_PREFIXES");
    for (const prefix of ["/auth", "/login", "/register"]) {
      expect(swPrivatePrefixes).toContain(prefix);
    }
  });

  it("ignora peticiones que no son GET", () => {
    expect(swSource).toContain('request.method !== "GET"');
  });

  it("ignora peticiones a otros origenes (Supabase)", () => {
    expect(swSource).toContain("url.origin !== self.location.origin");
  });

  it("solo precachea recursos publicos", () => {
    const precache = extractStringArray(swSource, "PRECACHE_URLS");
    const publicPrefixes = ["/offline", "/manifest", "/icons/"];
    for (const url of precache) {
      expect(publicPrefixes.some((prefix) => url.startsWith(prefix))).toBe(true);
    }
  });
});

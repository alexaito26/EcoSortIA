import { describe, expect, it } from "vitest";
import { isIos, isIosSafari, isStandalone, shouldShowIosGuide } from "./detect";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1";
const IPADOS_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const DESKTOP_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

describe("isIos", () => {
  it("detecta iPhone", () => {
    expect(isIos(IPHONE_SAFARI)).toBe(true);
  });

  it("detecta iPadOS, que se anuncia como Macintosh tactil", () => {
    expect(isIos(IPADOS_SAFARI, 5)).toBe(true);
  });

  it("no confunde un Mac de escritorio con iOS", () => {
    expect(isIos(DESKTOP_MAC, 0)).toBe(false);
  });

  it("no detecta Android como iOS", () => {
    expect(isIos(ANDROID_CHROME)).toBe(false);
  });
});

describe("isIosSafari", () => {
  it("acepta Safari en iOS", () => {
    expect(isIosSafari(IPHONE_SAFARI)).toBe(true);
  });

  it("rechaza Chrome en iOS", () => {
    expect(isIosSafari(IPHONE_CHROME)).toBe(false);
  });
});

describe("isStandalone", () => {
  it("detecta display-mode standalone (Android)", () => {
    expect(isStandalone(true)).toBe(true);
  });

  it("detecta navigator.standalone (iOS)", () => {
    expect(isStandalone(false, true)).toBe(true);
  });

  it("devuelve false en pestana normal", () => {
    expect(isStandalone(false, false)).toBe(false);
  });
});

describe("shouldShowIosGuide", () => {
  const base = { userAgent: IPHONE_SAFARI, standalone: false, dismissed: false };

  it("se muestra en Safari iOS sin instalar", () => {
    expect(shouldShowIosGuide(base)).toBe(true);
  });

  it("no se muestra si la app ya esta instalada", () => {
    expect(shouldShowIosGuide({ ...base, standalone: true })).toBe(false);
  });

  it("no se muestra si el usuario la descarto", () => {
    expect(shouldShowIosGuide({ ...base, dismissed: true })).toBe(false);
  });

  it("no se muestra en Android, que usa el prompt nativo", () => {
    expect(shouldShowIosGuide({ ...base, userAgent: ANDROID_CHROME })).toBe(false);
  });
});

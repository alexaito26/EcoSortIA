/**
 * Deteccion de plataforma y modo de visualizacion para la capa PWA.
 * Funciones puras (reciben el user agent) para poder probarlas sin navegador.
 */

/** iPhone / iPad / iPod, incluido iPadOS que se anuncia como Macintosh tactil. */
export function isIos(userAgent: string, maxTouchPoints = 0): boolean {
  if (/iPad|iPhone|iPod/i.test(userAgent)) return true;
  return /Macintosh/i.test(userAgent) && maxTouchPoints > 1;
}

/** Safari real en iOS (excluye Chrome/Firefox/Edge, que usan otro motor de UI). */
export function isIosSafari(userAgent: string, maxTouchPoints = 0): boolean {
  if (!isIos(userAgent, maxTouchPoints)) return false;
  return !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent);
}

/** La app ya se abrio como aplicacion instalada (Android o iOS). */
export function isStandalone(
  matches: boolean,
  navigatorStandalone?: boolean | undefined,
): boolean {
  return matches || navigatorStandalone === true;
}

/**
 * iOS no dispara `beforeinstallprompt`, asi que la instalacion solo puede
 * explicarse con instrucciones. Se muestran unicamente en Safari iOS cuando la
 * app todavia no esta instalada.
 */
export function shouldShowIosGuide(options: {
  userAgent: string;
  maxTouchPoints?: number;
  standalone: boolean;
  dismissed: boolean;
}): boolean {
  const { userAgent, maxTouchPoints = 0, standalone, dismissed } = options;
  if (standalone || dismissed) return false;
  return isIosSafari(userAgent, maxTouchPoints);
}

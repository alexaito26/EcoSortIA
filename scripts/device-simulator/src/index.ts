/**
 * EcoSort AI - Simulador de dispositivo (punto de ayuda).
 * La logica real esta en cli.ts. Ejecuta los comandos desde la raiz:
 *   pnpm simulator:event | simulator:heartbeat | simulator:stream
 *   pnpm simulator:error | simulator:duplicate
 */
import { DEVICE_EVENT_TYPES } from "@ecosort/shared";

function main(): void {
  console.log("EcoSort AI device-simulator (Fase 4)");
  console.log("Comandos: event | heartbeat | stream | error | duplicate");
  console.log(`Tipos de evento: ${DEVICE_EVENT_TYPES.join(", ")}`);
  console.log("Config: ECOSORT_API_BASE_URL, ECOSORT_DEVICE_CODE, ECOSORT_DEVICE_TOKEN");
}

main();

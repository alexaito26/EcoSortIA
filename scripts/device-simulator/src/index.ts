/**
 * EcoSort AI - Simulador de dispositivo (STUB).
 *
 * La implementacion real se hace en la Fase 4: generara eventos de
 * clasificacion, ruteo y heartbeats validados con los esquemas Zod de
 * `@ecosort/shared` y los enviara a las Edge Functions de Supabase usando
 * SIMULATOR_SUPABASE_URL y SIMULATOR_DEVICE_TOKEN (nunca hardcodeados).
 */
import { EVENT_TYPES, deviceEventSchema } from "@ecosort/shared";

function main(): void {
  console.log("EcoSort AI device-simulator - stub (Fase 4)");
  console.log(`Tipos de evento disponibles: ${EVENT_TYPES.join(", ")}`);
  // En Fase 4: construir y validar eventos con deviceEventSchema antes de enviarlos.
  void deviceEventSchema;
}

main();

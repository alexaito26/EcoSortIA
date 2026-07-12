/**
 * EcoSort AI - Generador/rotador de token de dispositivo (SOLO servidor).
 *
 * Genera un token nuevo para un dispositivo, guarda unicamente su hash bcrypt
 * (via RPC rotate_device_token) y muestra el token en claro UNA sola vez.
 *
 * Requiere (en .env local o entorno, NUNCA en Git):
 *   SUPABASE_URL o SIMULATOR_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Uso:
 *   pnpm --filter @ecosort/device-token start -- --code ECOSORT-01
 */
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

function arg(name: string, fallback?: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL ?? process.env.SIMULATOR_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const code = arg("code", "ECOSORT-01")!;

  if (!url || !serviceKey) {
    console.error(
      "Faltan variables: define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (usa un .env local).",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .select("id, code, is_active")
    .eq("code", code)
    .maybeSingle();

  if (deviceError) {
    console.error("Error consultando el dispositivo.");
    process.exit(1);
  }
  if (!device) {
    console.error(`No existe un dispositivo con code = ${code}.`);
    process.exit(1);
  }

  const { data: token, error: tokenError } = await supabase.rpc("rotate_device_token", {
    p_device_id: device.id,
  });

  if (tokenError || !token) {
    console.error("No se pudo rotar el token.");
    process.exit(1);
  }

  console.log("");
  console.log("=".repeat(64));
  console.log(`  Token generado para ${code}`);
  console.log("  Se muestra UNA sola vez. Guardalo en un lugar seguro.");
  console.log("  NUNCA lo subas a Git.");
  console.log("=".repeat(64));
  console.log("");
  console.log(`  x-device-code:  ${code}`);
  console.log(`  x-device-token: ${token}`);
  console.log("");
}

main().catch(() => {
  console.error("Error inesperado.");
  process.exit(1);
});

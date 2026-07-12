import "dotenv/config";

export type SimConfig = {
  baseUrl: string;
  code: string;
  token: string;
  anonKey?: string;
};

/**
 * Carga la configuracion desde el entorno. NUNCA imprime el token.
 * baseUrl apunta a la base de Edge Functions, p. ej.:
 *   https://<project-ref>.supabase.co/functions/v1
 */
export function loadConfig(): SimConfig {
  const baseUrl = process.env.ECOSORT_API_BASE_URL ?? process.env.SIMULATOR_SUPABASE_URL;
  const code = process.env.ECOSORT_DEVICE_CODE ?? "ECOSORT-01";
  const token = process.env.ECOSORT_DEVICE_TOKEN ?? process.env.SIMULATOR_DEVICE_TOKEN;
  const anonKey = process.env.ECOSORT_ANON_KEY;

  if (!baseUrl) {
    throw new Error("Falta ECOSORT_API_BASE_URL (base de las Edge Functions).");
  }
  if (!token) {
    throw new Error("Falta ECOSORT_DEVICE_TOKEN (usa scripts/device-token para generarlo).");
  }

  return { baseUrl: baseUrl.replace(/\/$/, ""), code, token, anonKey };
}

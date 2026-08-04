# Visión OpenAI y QR de EcoPuntos

La función `analyze-waste-image` recibe una URL pública o firmada y llama a la API de OpenAI desde Supabase Edge Functions. El navegador, el ESP32 y la pantalla nunca reciben `OPENAI_API_KEY` ni `SUPABASE_SERVICE_ROLE_KEY`.

## Secretos

Para desarrollo local crea `supabase/.env` (está ignorado por Git):

```dotenv
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
SITE_URL=http://localhost:3000
```

Ejecuta:

```bash
supabase start
supabase functions serve analyze-waste-image --env-file ./supabase/.env
```

En producción:

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set OPENAI_MODEL=gpt-4.1-mini
supabase secrets set SITE_URL=https://ecosort-ai-pi.vercel.app
supabase secrets list
supabase functions deploy analyze-waste-image
supabase functions deploy claim-eco-points
supabase functions deploy screen-next-event --no-verify-jwt
supabase functions deploy screen-ack-event --no-verify-jwt
```

`OPENAI_API_KEY` solo se lee con `Deno.env.get("OPENAI_API_KEY")`; no se añade a variables `NEXT_PUBLIC_*`, SQL, GitHub ni `firmware/**/secrets.h`. El archivo del firmware solo contiene Wi-Fi, token de dispositivo y URL de funciones.

La implementación usa Responses API con una entrada de imagen y JSON Schema estricto; la guía oficial describe tanto entradas visuales como Structured Outputs: [Images and vision](https://developers.openai.com/api/docs/guides/images-vision) y [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

## Flujo

`analyze-waste-image` autentica el dispositivo, normaliza la respuesta a `plastic`, `glass`, `reject` o `unknown`, y crea clasificación, ruteo, historial y evento de pantalla de forma idempotente. Solo plástico (10) y vidrio (15) generan un QR válido por cinco minutos. El token se muestra solamente dentro de `qr_content`; en la base queda exclusivamente SHA-256.

# Autenticacion de dispositivos (Fase 4)

Cada dispositivo se identifica con `x-device-code` + `x-device-token`. En la base
solo se guarda un **hash bcrypt** del token, nunca el token en claro.

## Modelo de datos

- `public.devices`: `code`, `is_active`, `status`, `firmware_version`,
  `model_version`, `last_seen_at`.
- `private.device_secrets` (schema privado, deny-all, solo `service_role`):
  `device_id`, `token_hash` (bcrypt via `pgcrypto`).

El schema `private` no esta expuesto por PostgREST; los clientes del navegador
no pueden leer el hash.

## Generacion / rotacion del token

Funcion `public.rotate_device_token(device_id)` (SECURITY DEFINER):
1. Verifica que el llamador sea admin (o contexto de servidor).
2. Genera un token aleatorio (`gen_random_bytes(24)` hex, 48 caracteres).
3. Guarda **solo** su hash bcrypt (`crypt(token, gen_salt('bf'))`).
4. Devuelve el token en claro **una sola vez**.

Ejecucion (solo servidor, requiere `service_role`):

```bash
# .env con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (NUNCA en Git)
pnpm token:generate -- --code ECOSORT-01
```

El script imprime el token una vez. Guardalo en un gestor seguro. Para rotarlo,
vuelve a ejecutar el comando (invalida el anterior).

- `rotate_device_token` esta restringida a `service_role` (no `authenticated`).
- No existe pantalla publica para generar tokens.

## Verificacion del token

Funcion `public.verify_device(code, token)` (SECURITY DEFINER, solo
`service_role`): compara `token_hash = crypt(token, token_hash)` y devuelve
banderas `found` / `authenticated` / `active`, que la Edge Function traduce a
404 / 401 / 403. Nunca expone el hash.

## Reglas de seguridad

- El `service_role` vive **solo** dentro de las Edge Functions (inyectado por
  Supabase). Nunca en el navegador ni en el firmware.
- Las Edge Functions se despliegan con `verify_jwt = false` porque implementan su
  propia autenticacion por token de dispositivo.
- Los tokens no se registran en logs ni se guardan en Git.
- Las tablas operativas no permiten escritura de clientes (RLS); toda escritura
  del dispositivo pasa por Edge Functions.

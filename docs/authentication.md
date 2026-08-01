# Autenticacion - EcoSort AI

Autenticacion con **email + contrasena** usando Supabase Auth y `@supabase/ssr`.

## Rutas

- `/login` - iniciar sesion
- `/register` - crear cuenta (rol siempre `user`)
- `/forgot-password` - solicitar enlace de restablecimiento
- `/reset-password` - definir nueva contrasena
- `/auth/confirm` - verificacion de correo y recuperacion (via `token_hash`)
- `/auth/callback` - intercambio de codigo (OAuth / Magic Link, PKCE)
- Logout - server action `signOut`

## Clientes

- Navegador: `lib/supabase/client.ts` (`createBrowserClient`).
- Servidor: `lib/supabase/server.ts` (`createServerClient` + cookies).
- Middleware: `lib/supabase/middleware.ts` refresca la sesion y protege
  `/home`, `/dashboard`, `/monitor`.

## Redirecciones por rol

Tras iniciar sesion (ver `lib/auth/roles.ts`):

| Rol      | Destino     |
| -------- | ----------- |
| admin    | /dashboard  |
| operator | /monitor    |
| viewer   | /dashboard  |
| user     | /home       |

- Usuario **no autenticado** en ruta protegida -> `/login`.
- Usuario autenticado **sin permiso** -> `/403`.

## Verificacion de correo

El registro **no** inicia sesion automaticamente. Tras registrarse se muestra:

> "Revisa tu correo electronico para confirmar tu cuenta."

El codigo soporta confirmacion por correo. Las plantillas de email de Supabase
deben apuntar a:

```
/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}&next=/home
```

### Durante desarrollo

Para agilizar pruebas se puede desactivar temporalmente la confirmacion de
correo en Supabase (Authentication > Providers > Email > "Confirm email").
El codigo sigue soportando el flujo con confirmacion activada.

## Redirects en produccion (Supabase Auth)

Obligatorio cuando la web vive en Vercel. En el dashboard de Supabase →
Authentication → URL Configuration:

1. **Site URL**: `https://ecosort-ai-pi.vercel.app`
2. **Redirect URLs**:
   - `https://ecosort-ai-pi.vercel.app/**`
   - `https://ecosort-ai-*-alexaito26s-projects.vercel.app/**` (previews)
   - `http://localhost:3000/**` (desarrollo)

Sin esto, recuperacion de contraseña y verificacion de correo fallan al volver
del email. Detalle en [deployment.md](./deployment.md).

## Seguridad

- El campo `role` nunca se acepta desde formularios (los esquemas Zod lo ignoran).
- La autorizacion real recae en RLS.
- `service_role` nunca se usa en el cliente.
- No hardcodear project-ref, tokens ni service_role en el codigo versionado.

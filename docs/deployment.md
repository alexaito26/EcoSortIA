# Despliegue en Vercel (Fase 7)

La app web (`apps/web`) se despliega en Vercel como proyecto Next.js dentro del
monorepo pnpm + Turborepo.

## URL de produccion

| | |
|-|-|
| Produccion | https://ecosort-ai-pi.vercel.app |
| Proyecto Vercel | `alexaito26s-projects/ecosort-ai` |
| Root Directory | `apps/web` |

## Configuracion del proyecto

| Ajuste              | Valor                                              |
| ------------------- | -------------------------------------------------- |
| Framework           | Next.js                                            |
| Root Directory      | `apps/web`                                         |
| Install Command     | `cd ../.. && pnpm install --frozen-lockfile`       |
| Build Command       | `cd ../.. && pnpm --filter web build`              |
| Node.js             | 24 (ver `.nvmrc` y `engines` del package.json raiz)|
| Archivo de ajustes  | `apps/web/vercel.json`                             |

El Root Directory apunta a `apps/web`, pero el install/build suben a la raiz
del monorepo para resolver `@ecosort/shared` via el workspace de pnpm.

## Variables de entorno

Solo hacen falta las **publicas** para que la web arranque. No hay
`service_role` en el runtime de Next.js (las Edge Functions de IoT viven en
Supabase, no en Vercel).

| Variable                        | Entornos                         | Notas                                      |
| ------------------------------- | -------------------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Production, Preview, Development | URL del proyecto Supabase                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development | Clave publishable o anon (segura en cliente) |
| `NEXT_PUBLIC_SITE_URL`          | Production, Preview              | URL publica del sitio (callbacks de auth)  |

En Preview, `NEXT_PUBLIC_SITE_URL` puede apuntar al dominio de produccion si
los redirects de Supabase Auth incluyen `*.vercel.app`. Alternativa: dejar
que el codigo derive el host desde `x-forwarded-host` (ya lo hace si la
variable no esta definida).

### Como cargarlas (CLI)

```bash
# Desde la raiz del monorepo, con el proyecto ya linkeado
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add NEXT_PUBLIC_SITE_URL production
# Repetir para preview (y development si quieres)
```

O desde el dashboard: Project → Settings → Environment Variables.

## Primer despliegue

```bash
# 1. Login (abre el navegador)
npx vercel login

# 2. Linkear el monorepo con Root Directory = apps/web
npx vercel link --yes --project ecosort-ai --scope alexaito26s-projects
# En el dashboard (o con vercel project), fijar Root Directory = apps/web

# 3. Preview
npx vercel

# 4. Produccion
npx vercel --prod
```

Tras el primer deploy por CLI, conviene conectar el repo de GitHub en el
dashboard de Vercel para que cada push a `main` publique produccion y cada
PR genere un preview automatico.

## Redirects de Supabase Auth

En el dashboard de Supabase → Authentication → URL Configuration:

1. **Site URL**: `https://ecosort-ai-pi.vercel.app`
2. **Redirect URLs** (añadir todas las que apliquen):
   - `https://ecosort-ai-pi.vercel.app/**`
   - `https://ecosort-ai-*-alexaito26s-projects.vercel.app/**` (previews)
   - `http://localhost:3000/**` (desarrollo local)

Sin esto, el login, la recuperacion de contraseña y la verificacion de correo
fallan al volver del email porque Supabase rechaza el callback.

## Comprobaciones post-despliegue

- [ ] La landing carga por HTTPS.
- [ ] `/manifest.webmanifest` responde 200.
- [ ] `/sw.js` responde 200 y con `Cache-Control: no-cache`.
- [ ] Login con el usuario demo o admin.
- [ ] Dashboard y monitor cargan datos (RLS + Realtime).
- [ ] Instalacion PWA en Android (Chrome) y guia en iOS Safari.
- [ ] Callbacks de auth (registro / forgot password) vuelven al dominio correcto.

## Que NO se despliega en Vercel

- **Firmware** (`firmware/`): se flashea al ESP32 con PlatformIO.
- **Edge Functions IoT** (`supabase/functions/`): viven en Supabase.
- **Simulador / token scripts** (`scripts/`): uso local o CI propio.

## Seguridad

- Nunca subir `.env.local` ni `SUPABASE_SERVICE_ROLE_KEY` a Vercel como
  `NEXT_PUBLIC_*`.
- Las unicas claves del runtime web son la URL y la clave publishable/anon.
- El token de dispositivo y el service_role se quedan fuera de este despliegue.

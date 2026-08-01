# Despliegue en Vercel (Fase 7)

La app web (`apps/web`) se despliega en Vercel como proyecto Next.js dentro del
monorepo pnpm + Turborepo.

## URL de produccion

| | |
|-|-|
| Produccion | https://ecosort-ai-pi.vercel.app |
| Proyecto Vercel | `alexaito26s-projects/ecosort-ai` |
| Repo GitHub | `alexaito26/EcoSortIA` (conectado) |
| Production branch | `main` |
| Root Directory | `apps/web` |

## Deploy automatico (Git)

El proyecto esta enlazado a GitHub. No hace falta `vercel deploy` manual:

| Evento | Resultado |
| ------ | --------- |
| Push a `main` que afecta `apps/web` (o deps del workspace) | Deploy de **produccion** |
| Pull request / otra rama | Deploy de **preview** |
| Push solo a `docs/`, `firmware/`, etc. | Puede **no** disparar build (Root Directory = `apps/web`) |

Comprobar en el dashboard de Vercel → Deployments: el deploy debe mostrar el
commit de GitHub (sin `actor: cursor-cli`). Si GitHub pide autorizar la app
Vercel, aceptar el OAuth una vez.

```bash
# Reconectar (solo si se desliga)
npx vercel git connect https://github.com/alexaito26/EcoSortIA.git --yes --scope alexaito26s-projects
```

## Configuracion del proyecto

| Ajuste              | Valor                                              |
| ------------------- | -------------------------------------------------- |
| Framework           | Next.js                                            |
| Root Directory      | `apps/web`                                         |
| Install Command     | `cd ../.. && pnpm install --frozen-lockfile`       |
| Build Command       | `cd ../.. && pnpm --filter web build`              |
| Node.js             | 24 (ver `.nvmrc` y `engines` del package.json raiz)|
| Archivo de ajustes  | `apps/web/vercel.json`                             |
| Archivos fuera del root | Habilitado (`sourceFilesOutsideRootDirectory`) |

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

## Despliegue manual (solo emergencia)

Con Git conectado, el camino normal es `git push`. Si hace falta un deploy
puntual sin push:

```bash
npx vercel login
npx vercel link --yes --project ecosort-ai --scope alexaito26s-projects
npx vercel          # preview
npx vercel --prod   # produccion
```

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

## Seguridad (sin hardcode)

- Secretos y URLs de proyecto solo en env (Vercel / `.env.local` / `secrets.h`
  local). Nunca `project-ref`, service_role ni device tokens en el codigo
  versionado.
- Nunca subir `.env.local` ni `SUPABASE_SERVICE_ROLE_KEY` a Vercel como
  `NEXT_PUBLIC_*`.
- Las unicas claves del runtime web son la URL y la clave publishable/anon.
- El token de dispositivo y el service_role se quedan fuera de este despliegue.

## Datos del dashboard: seed vs vivo

Ver el checklist en [iot-backend-test-plan.md](./iot-backend-test-plan.md)
(seccion "Seed vs simulador vs firmware"). Resumen:

| Fuente | `event_id` | Hardware |
| ------ | ---------- | -------- |
| Seed SQL | UUID fijos `88888888-…` | No |
| Simulador Node | `evt-…` | No (HTTP real a Edge Functions) |
| Firmware ESP32 | `evt-<bootId>-…` | Si, cuando esta flasheado |

# Supabase - EcoSort AI

Base de datos PostgreSQL con Auth, Row Level Security, Realtime y (mas adelante)
Edge Functions.

## Esquema

Migraciones versionadas en `supabase/migrations/`:

- `0001_enums_and_tables.sql`: enums, tablas, indices y el schema privado
  `private` (incluye `private.device_secrets`, donde vive el `token_hash` del
  dispositivo, nunca expuesto por la API ni versionado en Git).
- `0002_functions_and_triggers.sql`: `handle_new_user`, `set_updated_at`,
  `prevent_role_change`, `award_eco_points`, `promote_user` y `private.user_role`.
- `0003_rls_policies.sql`: RLS y politicas por rol.

Tablas principales: `profiles`, `devices`, `containers`, `classifications`,
`routing_events`, `device_events`, `system_logs`, `eco_points_ledger`.

## Roles y RLS

- **admin**: administra todo el sistema.
- **operator**: consulta datos operativos y gestiona estados operativos
  (dispositivos y contenedores). No puede modificar roles.
- **viewer**: solo lectura de dashboards, clasificaciones y estados.
- **user**: solo su propio perfil (sin poder cambiar `role`) y sus propias
  clasificaciones, puntos y recompensas.

Nadie puede leer `token_hash` desde el cliente (vive en el schema `private`).
Los eventos de dispositivo se insertan mediante Edge Functions (service_role) en
la Fase 4.

## Como asignar el primer administrador

No se guarda ningun correo personal en el repositorio. El primer admin se crea
asi:

1. La persona responsable se **registra normalmente** en la app (rol inicial `user`).
2. Un responsable con acceso a la base de datos ejecuta el siguiente SQL,
   reemplazando el correo de ejemplo por el correo real (se proporciona
   manualmente, no se versiona):

```sql
-- Ejecutar como servidor (SQL Editor de Supabase / service_role).
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@ejemplo.com');
```

3. A partir de ese momento, ese admin puede asignar otros roles con la funcion
   protegida:

```sql
select public.promote_user(
  (select id from auth.users where email = 'operador@ejemplo.com'),
  'operator'
);
```

`promote_user` solo funciona si quien la invoca es admin (o se ejecuta como
servidor). Un usuario normal no puede promoverse: el trigger
`prevent_role_change` y las politicas RLS lo impiden.

> Nota: `admin@ejemplo.com` es un placeholder. No es un correo real.

## Como ejecutar el seed (SOLO desarrollo)

`supabase/seed.sql` es un **bootstrap minimo**: cuentas de acceso + dispositivo
`ECOSORT-01` + contenedores vacios. **No inserta historial** (clasificaciones,
ruteos, logs, EcoPuntos inventados). El historial debe salir del simulador o
del firmware.

- Preferible solo en local (`supabase db reset`).
- Para vaciar historial en un proyecto ya usado:
  `scripts/clear-operational-data.sql`.

```bash
supabase db reset          # migraciones + seed bootstrap en local
# o:
psql "$DATABASE_URL" -f supabase/seed.sql
```

Cuentas de acceso de desarrollo (no son correos personales):
`user@ejemplo.com` / `admin@ejemplo.com`.

El token del dispositivo `ECOSORT-01` se configura por separado en
`private.device_secrets` y nunca se versiona.

## EcoPuntos: si sirven (y cuando no)

Si, el sistema es real en base de datos y UI:

1. Al insertar una clasificacion con `user_id` y `eco_points_awarded > 0`, el
   trigger `award_eco_points` suma en `profiles.eco_points` y escribe en
   `eco_points_ledger` (idempotente por `classification_id`).
2. La vista `/home` y la tabla de usuarios muestran ese contador.
3. En ingest, los puntos solo se otorgan si el payload trae `user_id` **y**
   `routing_success` es true (`ingest_device_event` en `0006_device_functions.sql`).

Limitacion actual: el dispositivo/simulador debe enviar `user_id` (UUID del
perfil). Sin eso, la clasificacion queda anonima y **no suma puntos**. El
simulador lo soporta con `--user-id <uuid>`:

```bash
pnpm simulator:event -- --material plastic --user-id 11111111-1111-1111-1111-111111111111
```

Aun no hay flujo de app (QR / sesion en el dispositivo) que enlace al usuario
logueado automaticamente; eso seria una mejora aparte.

## Separacion desarrollo / produccion

- Migraciones estructurales (`supabase/migrations/`): obligatorias en todos los
  entornos.
- Datos demo (`supabase/seed.sql`): solo desarrollo.

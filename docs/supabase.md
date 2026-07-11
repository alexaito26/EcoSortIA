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

`supabase/seed.sql` contiene datos demo **deterministas e idempotentes**
(dispositivo `ECOSORT-01`, contenedores, clasificaciones, ruteos, logs y
EcoPuntos). Puede ejecutarse varias veces sin duplicar informacion.

- **NO debe ejecutarse en produccion.**
- Con Supabase CLI (entorno local):

```bash
supabase db reset          # aplica migraciones + seed en local
# o solo el seed:
psql "$DATABASE_URL" -f supabase/seed.sql
```

- El seed crea un usuario demo `user@ejemplo.com` (rol `user`) unicamente para
  desarrollo. No es un correo personal ni una credencial de produccion.

El token del dispositivo `ECOSORT-01` se configura por separado en
`private.device_secrets` y nunca se versiona.

## Separacion desarrollo / produccion

- Migraciones estructurales (`supabase/migrations/`): obligatorias en todos los
  entornos.
- Datos demo (`supabase/seed.sql`): solo desarrollo.

-- =====================================================================
-- EcoSort AI - 0002 - Funciones y triggers
-- =====================================================================

-- Helper de autorizacion (schema privado, no expuesto). SECURITY DEFINER
-- para leer profiles sin recursion de RLS. search_path explicito.
create or replace function private.user_role(uid uuid)
returns public.user_role language sql stable security definer set search_path = ''
as $fn$ select role from public.profiles where id = uid $fn$;

-- Crea el perfil automaticamente al registrarse un usuario. Rol SIEMPRE 'user'.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $fn$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, nullif(new.raw_user_meta_data->>'full_name',''), 'user')
  on conflict (id) do nothing;
  return new;
end $fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantiene updated_at.
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $fn$ begin new.updated_at = now(); return new; end $fn$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists trg_devices_updated on public.devices;
create trigger trg_devices_updated before update on public.devices for each row execute function public.set_updated_at();
drop trigger if exists trg_containers_updated on public.containers;
create trigger trg_containers_updated before update on public.containers for each row execute function public.set_updated_at();
drop trigger if exists trg_device_secrets_updated on private.device_secrets;
create trigger trg_device_secrets_updated before update on private.device_secrets for each row execute function public.set_updated_at();

-- Impide que un usuario no-admin cambie el rol (defensa junto a RLS).
-- Se permite en contexto de servidor/superusuario (auth.uid() is null).
create or replace function public.prevent_role_change()
returns trigger language plpgsql security definer set search_path = ''
as $fn$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and private.user_role(auth.uid()) is distinct from 'admin' then
    raise exception 'No autorizado para cambiar el rol del perfil';
  end if;
  return new;
end $fn$;

drop trigger if exists trg_profiles_prevent_role_change on public.profiles;
create trigger trg_profiles_prevent_role_change before update on public.profiles for each row execute function public.prevent_role_change();

-- Otorga EcoPuntos al insertar una clasificacion (idempotente por classification_id).
create unique index if not exists uq_ledger_classification on public.eco_points_ledger(classification_id) where classification_id is not null;

create or replace function public.award_eco_points()
returns trigger language plpgsql security definer set search_path = ''
as $fn$
begin
  if new.user_id is not null and new.eco_points_awarded > 0 then
    update public.profiles set eco_points = eco_points + new.eco_points_awarded where id = new.user_id;
    insert into public.eco_points_ledger (user_id, points, reason, classification_id)
    values (new.user_id, new.eco_points_awarded, 'classification', new.id)
    on conflict (classification_id) where classification_id is not null do nothing;
  end if;
  return new;
end $fn$;

drop trigger if exists trg_award_eco_points on public.classifications;
create trigger trg_award_eco_points after insert on public.classifications for each row execute function public.award_eco_points();

-- Promocion de usuarios controlada (solo admins). El primer admin se asigna
-- via SQL de servidor (auth.uid() is null) segun docs/supabase.md.
create or replace function public.promote_user(target uuid, new_role public.user_role)
returns void language plpgsql security definer set search_path = ''
as $fn$
begin
  if auth.uid() is not null and private.user_role(auth.uid()) is distinct from 'admin' then
    raise exception 'Solo un administrador puede asignar roles';
  end if;
  update public.profiles set role = new_role where id = target;
end $fn$;

-- --------------------------- Privilegios ----------------------------
-- Las funciones-trigger NO deben ser invocables via RPC.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.prevent_role_change() from public, anon, authenticated;
revoke all on function public.award_eco_points() from public, anon, authenticated;

-- Helper de rol: usable por policies (authenticated). No para anon.
grant usage on schema private to authenticated;
revoke all on function private.user_role(uuid) from public, anon;
grant execute on function private.user_role(uuid) to authenticated;

-- promote_user: solo autenticados (admins, verificado internamente).
revoke all on function public.promote_user(uuid, public.user_role) from public, anon;
grant execute on function public.promote_user(uuid, public.user_role) to authenticated;

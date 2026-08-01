-- Limpia historial operativo. Conserva usuarios, dispositivo y contenedores.
-- Ejecutar en el SQL Editor de Supabase o via MCP execute_sql.
-- NO borra auth.users ni private.device_secrets.

begin;

delete from public.eco_points_ledger;
delete from public.sensor_readings;
delete from public.routing_events;
delete from public.classifications;
delete from public.device_events;
delete from public.system_logs;

update public.containers
set fill_percent = 0,
    level = 'empty',
    updated_at = now();

update public.profiles
set eco_points = 0;

update public.devices
set status = 'offline',
    last_seen_at = null
where code = 'ECOSORT-01';

commit;

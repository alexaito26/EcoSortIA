-- =====================================================================
-- EcoSort AI - 0004 - Habilitar Supabase Realtime
-- ---------------------------------------------------------------------
-- Agrega las tablas del monitor en vivo a la publicacion supabase_realtime.
-- La RLS sigue aplicando: cada cliente solo recibe los cambios de las
-- filas que puede leer (staff para devices/containers/classifications).
-- =====================================================================

alter publication supabase_realtime add table public.classifications;
alter publication supabase_realtime add table public.containers;
alter publication supabase_realtime add table public.devices;
alter publication supabase_realtime add table public.routing_events;

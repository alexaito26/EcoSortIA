-- ON CONFLICT(event_id) de la RPC requiere una restricción única completa.
-- PostgreSQL permite múltiples NULL en UNIQUE, por lo que los registros
-- históricos sin event_id continúan siendo válidos.
alter table public.historial_escaneos
  add constraint historial_escaneos_event_id_key unique (event_id);

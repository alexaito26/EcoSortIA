-- =====================================================================
-- EcoSort AI - 0007 - Endurecer privilegios
-- ---------------------------------------------------------------------
-- rotate_device_token se genera SOLO desde el servidor (service_role) via
-- scripts/device-token. Se revoca a authenticated para evitar el warning
-- del linter (0029) y reducir la superficie de ataque.
-- =====================================================================

revoke execute on function public.rotate_device_token(uuid) from authenticated;

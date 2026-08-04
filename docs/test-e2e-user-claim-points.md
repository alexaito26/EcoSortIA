# Prueba E2E: análisis y reclamo de EcoPuntos

1. Ejecuta `supabase db reset` localmente, o aplica las migraciones en el proyecto enlazado.
2. Configura `OPENAI_API_KEY`, `OPENAI_MODEL` y `SITE_URL`; despliega las cuatro funciones indicadas en `openai-vision-integration.md`.
3. Verifica un dispositivo de control y configura su token; la pantalla usa el mismo `device_code` de la estación que muestra.
4. Crea e inicia sesión con un usuario normal en la web.
5. Define `TEST_IMAGE_URL` con una URL pública o firmada de una imagen y ejecuta `pnpm simulate:image`.
6. Confirma registros en `historial_escaneos`, `classifications`, `routing_events` y un `screen_event` con `claim_status = 'unclaimed'` para plástico/vidrio.
7. Enciende la pantalla, verifica que muestra el QR y abre `qr_content` en el navegador.
8. Inicia sesión cuando se solicite y confirma el mensaje de reclamo. Comprueba una fila en `eco_points_ledger`, el saldo en `profiles.eco_points` y la actividad de `/home`.
9. Genera un nuevo evento y pulsa **Finalizar sin reclamar** en la pantalla. Debe terminar con `claim_status = 'skipped'` y sin movimiento de ledger.
10. Espera cinco minutos para probar `QR_EXPIRED`; vuelve a abrir un QR ya usado para `QR_ALREADY_CLAIMED`.
11. Usa una imagen de residuo no aceptado y confirma que no hay QR ni puntos. Repite exactamente el mismo `event_id` para comprobar `duplicate: true` sin filas ni puntos extra.

## Consultas SQL

```sql
select * from public.historial_escaneos order by created_at desc limit 5;
select * from public.classifications order by created_at desc limit 5;
select * from public.routing_events order by created_at desc limit 5;
select * from public.screen_events order by created_at desc limit 5;
select * from public.screen_events where claim_status = 'unclaimed' order by created_at desc;
select * from public.screen_events where claim_status = 'claimed' order by claimed_at desc;
select * from public.screen_events where claim_status = 'skipped' order by updated_at desc;
select id, email, full_name, eco_points from public.profiles where id = 'UUID_DEL_USUARIO';
select * from public.eco_points_ledger where user_id = 'UUID_DEL_USUARIO' order by created_at desc;
select l.created_at, l.points, l.reason, c.category, c.confidence, d.code as device_code, d.name as device_name
from public.eco_points_ledger l left join public.classifications c on c.id = l.classification_id
left join public.devices d on d.id = c.device_id where l.user_id = 'UUID_DEL_USUARIO' order by l.created_at desc;
select * from public.device_events where event_id = 'EVENT_ID_DE_PRUEBA';
```

-- Este script configura un trabajo programado (cron job) automático en Supabase
-- para borrar las notificaciones antiguas cada 2 horas.

-- 1. Asegurarse de que la extensión pg_cron esté instalada (por defecto en Supabase lo está)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Eliminar el trabajo si ya existía previamente (para no duplicarlo si corres el script varias veces)
SELECT cron.unschedule('borrar_notificaciones_viejas');

-- 3. Crear el trabajo que se ejecutará cada 2 horas
-- Expresión Cron '0 */2 * * *' significa: En el minuto 0 de cada 2 horas (ej. 12:00, 14:00, 16:00, etc.)
SELECT cron.schedule(
  'borrar_notificaciones_viejas',
  '0 */2 * * *',
  $$ DELETE FROM notificaciones WHERE created_at < NOW() - INTERVAL '2 hours' $$
);

-- Nota: Solo se borrarán las notificaciones que tengan más de 2 horas de antigüedad
-- para asegurar que los usuarios tengan tiempo de leer las recientes.

-- =====================================================================================
-- SCRIPT PARA AUTOMATIZAR LA PURGA DE HORARIOS DE TRABAJADORES EN SUPABASE (PG_CRON)
-- =====================================================================================
-- Este script programa una tarea en Supabase para vaciar la tabla `trabajador_horarios`
-- todos los domingos a las 00:00 (medianoche), evitando acumulación excesiva de datos.

-- 1. Habilitar la extensión pg_cron en Supabase si no está activa
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Eliminar la tarea previa solo si existe (evita el error 'could not find valid entry')
SELECT cron.unschedule(jobid) 
FROM cron.job 
WHERE jobname = 'borrar_horarios_semanales';

-- 3. Programar la tarea automática para cada domingo a la medianoche (00:00)
-- Expresión Cron '0 0 * * 0': Minuto 0, Hora 0, Todos los días del mes, Todos los meses, Día de la semana 0 (Domingo)
SELECT cron.schedule(
  'borrar_horarios_semanales',
  '0 0 * * 0',
  $$ DELETE FROM public.trabajador_horarios; $$
);

-- Para verificar las tareas programadas activas en tu Supabase, puedes ejecutar:
-- SELECT * FROM cron.job;

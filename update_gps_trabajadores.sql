-- ==========================================
-- SCRIPT PARA HABILITAR RASTREO REAL DE MOTOS
-- Ejecutar en el SQL Editor de Supabase
-- ==========================================

-- Añadir columnas a la tabla de trabajadores si no existen
ALTER TABLE public.trabajadores
ADD COLUMN IF NOT EXISTS latitud NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS longitud NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS ultima_actualizacion_gps TIMESTAMP WITH TIME ZONE;

-- (Opcional) Limpiar el estado de los que quedaron bugeados como en_proceso si la base se reinició
-- UPDATE public.trabajadores SET estado_disponibilidad = 'inactivo';

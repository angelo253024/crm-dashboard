-- Este script habilita las actualizaciones en tiempo real (Realtime) para la tabla 'reservas'
-- Es obligatorio correr esto en el editor SQL de Supabase para que las notificaciones lleguen sin recargar la página.

BEGIN;

DO $$
BEGIN
  -- Verificar si la publicación 'supabase_realtime' existe
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Asegurarnos de que la tabla 'reservas' esté agregada al canal de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE reservas;

-- (Opcional pero recomendado) Hacer lo mismo con la tabla de trabajadores si no estaba activada
ALTER PUBLICATION supabase_realtime ADD TABLE trabajadores;

-- Opcional: Configurar Replica Identity a FULL para poder ver los datos anteriores en los eventos UPDATE
ALTER TABLE reservas REPLICA IDENTITY FULL;

COMMIT;

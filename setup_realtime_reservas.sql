-- Este script habilita las actualizaciones en tiempo real (Realtime) para la tabla 'reservas'

-- Agregar la tabla 'reservas' al canal de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE reservas;

-- Configurar Replica Identity a FULL para poder ver los datos anteriores en los eventos UPDATE
ALTER TABLE reservas REPLICA IDENTITY FULL;

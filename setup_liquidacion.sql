-- =====================================================================================
-- MÓDULO DE LIQUIDACIÓN Y NÓMINA AUTOMÁTICA
-- Este script crea las tablas necesarias sin alterar datos existentes.
-- =====================================================================================

-- 1. Añadir columna servicios_detalle a reservas para guardar el JSON exacto
ALTER TABLE public.reservas 
ADD COLUMN IF NOT EXISTS servicios_detalle JSONB DEFAULT '[]'::jsonb;

-- 2. Crear tabla comisiones
CREATE TABLE IF NOT EXISTS public.comisiones (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    reserva_id uuid REFERENCES public.reservas(id) ON DELETE SET NULL,
    trabajador_id uuid REFERENCES public.trabajadores(id) ON DELETE CASCADE,
    servicio_id uuid,
    servicio_nombre text NOT NULL,
    tipo text NOT NULL, -- 'Lavado' o 'Extra'
    precio numeric NOT NULL,
    porcentaje numeric NOT NULL, -- 0.5 (50%) o 0.4 (40%)
    monto_comision numeric NOT NULL,
    estado text DEFAULT 'pendiente' -- 'pendiente', 'pagado'
);

-- 3. Crear tabla anticipos
CREATE TABLE IF NOT EXISTS public.anticipos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    trabajador_id uuid REFERENCES public.trabajadores(id) ON DELETE CASCADE,
    administrador_id uuid REFERENCES public.trabajadores(id) ON DELETE SET NULL,
    monto numeric NOT NULL,
    observaciones text,
    estado text DEFAULT 'pendiente' -- 'pendiente' (se descuenta del saldo), 'liquidado' (ya se cobró en un pago)
);

-- 4. Crear tabla pagos_liquidacion
CREATE TABLE IF NOT EXISTS public.pagos_liquidacion (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    trabajador_id uuid REFERENCES public.trabajadores(id) ON DELETE CASCADE,
    administrador_id uuid REFERENCES public.trabajadores(id) ON DELETE SET NULL,
    monto_generado numeric NOT NULL,
    anticipos_descontados numeric NOT NULL,
    monto_pagado numeric NOT NULL,
    periodo text,
    observaciones text
);

-- 5. Función y Trigger para automatizar el cálculo de comisiones
CREATE OR REPLACE FUNCTION generar_comisiones_automaticas()
RETURNS TRIGGER AS $$
DECLARE
    servicio_record jsonb;
    v_tipo text;
    v_porcentaje numeric;
    v_monto numeric;
BEGIN
    -- Solo ejecutar cuando el estado cambie a 'completado'
    IF NEW.estado_reserva = 'completado' AND OLD.estado_reserva IS DISTINCT FROM 'completado' THEN
        
        -- Si servicios_detalle está vacío, intentamos rescatar el servicio principal
        -- Esto es por retrocompatibilidad con reservas antiguas (aunque ya deberían estar pagadas)
        IF jsonb_array_length(NEW.servicios_detalle) = 0 THEN
            -- No hacemos nada automáticamente para las antiguas si no tienen detalle para evitar dobles pagos.
            RETURN NEW;
        END IF;

        -- Iterar sobre el JSONB de servicios_detalle
        FOR servicio_record IN SELECT * FROM jsonb_array_elements(NEW.servicios_detalle)
        LOOP
            -- Determinar el tipo (Lavado = 50%, Extra = 40%)
            -- Asumimos que si la categoría contiene la palabra 'Lavado' (case insensitive), es lavado.
            IF servicio_record->>'categoria' ILIKE '%Lavado%' THEN
                v_tipo := 'Lavado';
                v_porcentaje := 0.50;
            ELSE
                v_tipo := 'Extra';
                v_porcentaje := 0.40;
            END IF;

            -- Calcular comisión
            v_monto := (servicio_record->>'precio')::numeric * v_porcentaje;

            -- Insertar comisión
            INSERT INTO public.comisiones (
                reserva_id,
                trabajador_id,
                servicio_id,
                servicio_nombre,
                tipo,
                precio,
                porcentaje,
                monto_comision,
                estado
            ) VALUES (
                NEW.id,
                NEW.trabajador_id,
                (servicio_record->>'id')::uuid,
                servicio_record->>'nombre',
                v_tipo,
                (servicio_record->>'precio')::numeric,
                v_porcentaje,
                v_monto,
                'pendiente'
            );
        END LOOP;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Borrar el trigger si ya existe y recrearlo
DROP TRIGGER IF EXISTS trigger_generar_comisiones ON public.reservas;

CREATE TRIGGER trigger_generar_comisiones
AFTER UPDATE ON public.reservas
FOR EACH ROW
EXECUTE FUNCTION generar_comisiones_automaticas();

-- 6. Configurar RLS (Row Level Security) para que la web pueda leer/escribir libremente
ALTER TABLE public.comisiones DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.anticipos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_liquidacion DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.comisiones TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.anticipos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.pagos_liquidacion TO anon, authenticated, service_role;

-- Listo!

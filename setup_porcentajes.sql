-- =====================================================================================
-- MÓDULO DE COMISIONES DINÁMICAS Y AUDITORÍA
-- =====================================================================================

-- 1. Añadir columna de porcentaje a la tabla de servicios
ALTER TABLE public.servicios 
ADD COLUMN IF NOT EXISTS comision_porcentaje numeric DEFAULT 0.50;

-- 2. Establecer valores iniciales correctos (Retrocompatibilidad)
-- Lavados = 50% (0.50), Extras = 40% (0.40)
UPDATE public.servicios
SET comision_porcentaje = 0.50
WHERE categoria ILIKE '%Lavado%';

UPDATE public.servicios
SET comision_porcentaje = 0.40
WHERE categoria NOT ILIKE '%Lavado%';

-- 3. Crear tabla de auditoría para mantener inmutabilidad y registro de cambios
CREATE TABLE IF NOT EXISTS public.auditoria_porcentajes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    servicio_id uuid REFERENCES public.servicios(id) ON DELETE CASCADE,
    administrador_id uuid REFERENCES public.trabajadores(id) ON DELETE SET NULL,
    porcentaje_anterior numeric NOT NULL,
    porcentaje_nuevo numeric NOT NULL
);

-- Permisos para la tabla de auditoría
ALTER TABLE public.auditoria_porcentajes DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.auditoria_porcentajes TO anon, authenticated, service_role;

-- 4. Modificar el Trigger para que lea el porcentaje dinámicamente de la base de datos
CREATE OR REPLACE FUNCTION generar_comisiones_automaticas()
RETURNS TRIGGER AS $$
DECLARE
    servicio_record jsonb;
    v_tipo text;
    v_porcentaje numeric;
    v_monto numeric;
    v_servicio_id uuid;
BEGIN
    -- Solo ejecutar cuando el estado cambie a 'completado'
    IF NEW.estado_reserva = 'completado' AND OLD.estado_reserva IS DISTINCT FROM 'completado' THEN
        
        IF jsonb_array_length(NEW.servicios_detalle) = 0 THEN
            RETURN NEW;
        END IF;

        -- Iterar sobre el JSONB de servicios_detalle
        FOR servicio_record IN SELECT * FROM jsonb_array_elements(NEW.servicios_detalle)
        LOOP
            v_servicio_id := (servicio_record->>'id')::uuid;

            -- Buscar el porcentaje ACTUAL directamente de la tabla servicios (inmutabilidad futura garantizada)
            SELECT comision_porcentaje INTO v_porcentaje
            FROM public.servicios
            WHERE id = v_servicio_id;

            -- Fallback de seguridad en caso de que el servicio haya sido borrado
            IF v_porcentaje IS NULL THEN
                IF servicio_record->>'categoria' ILIKE '%Lavado%' THEN
                    v_porcentaje := 0.50;
                ELSE
                    v_porcentaje := 0.40;
                END IF;
            END IF;

            -- Determinar tipo para display visual en frontend
            IF servicio_record->>'categoria' ILIKE '%Lavado%' THEN
                v_tipo := 'Lavado';
            ELSE
                v_tipo := 'Extra';
            END IF;

            -- Calcular comisión con el porcentaje exacto de este segundo
            v_monto := (servicio_record->>'precio')::numeric * v_porcentaje;

            -- Insertar comisión (El historial no se toca)
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
                v_servicio_id,
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

-- El trigger en sí ya existe, pero la función subyacente ha sido reemplazada.
-- Listo!

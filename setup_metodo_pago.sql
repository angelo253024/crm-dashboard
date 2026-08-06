-- 1. Añadir campos a la tabla reservas (si no existen)
ALTER TABLE public.reservas 
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('QR', 'EFECTIVO')),
ADD COLUMN IF NOT EXISTS payment_status TEXT CHECK (payment_status IN ('PAGADO', 'PENDIENTE')),
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_by UUID REFERENCES public.trabajadores(id),
ADD COLUMN IF NOT EXISTS monto_recibido NUMERIC,
ADD COLUMN IF NOT EXISTS cambio_devuelto NUMERIC;

-- 2. Crear tabla de configuraciones de pago
CREATE TABLE IF NOT EXISTS public.configuraciones_pago (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_image_url TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.configuraciones_pago ENABLE ROW LEVEL SECURITY;

-- Políticas para configuraciones_pago (Lectura pública para trabajadores, escritura para admin)
DROP POLICY IF EXISTS "Todos pueden leer configuraciones de pago" ON public.configuraciones_pago;
CREATE POLICY "Todos pueden leer configuraciones de pago"
ON public.configuraciones_pago FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Todos pueden insertar/actualizar configuraciones de pago" ON public.configuraciones_pago;
CREATE POLICY "Todos pueden insertar/actualizar configuraciones de pago"
ON public.configuraciones_pago FOR ALL
USING (true)
WITH CHECK (true); -- Simplificado para entorno de demo. En prod: admin only.

-- Insertar un registro por defecto si la tabla está vacía
INSERT INTO public.configuraciones_pago (qr_image_url)
SELECT 'https://via.placeholder.com/300x300.png?text=QR+Falso'
WHERE NOT EXISTS (SELECT 1 FROM public.configuraciones_pago);

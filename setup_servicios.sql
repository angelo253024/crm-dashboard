-- 1. Crear la tabla de servicios
CREATE TABLE IF NOT EXISTS public.servicios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  nombre text NOT NULL,
  categoria text NOT NULL,
  precio numeric NOT NULL,
  disponible boolean DEFAULT true,
  imagen_url text
);

-- Deshabilitar RLS temporalmente
ALTER TABLE public.servicios DISABLE ROW LEVEL SECURITY;


-- 2. Crear la tabla de notificaciones (que también se usa al guardar un servicio)
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  mensaje text NOT NULL,
  tipo text DEFAULT 'info',
  leida boolean DEFAULT false
);

-- Deshabilitar RLS temporalmente para notificaciones
ALTER TABLE public.notificaciones DISABLE ROW LEVEL SECURITY;

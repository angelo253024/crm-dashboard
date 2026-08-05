-- 1. Crear la tabla de servicios si no existe
CREATE TABLE IF NOT EXISTS public.servicios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  nombre text NOT NULL,
  categoria text NOT NULL,
  precio numeric NOT NULL,
  disponible boolean DEFAULT true,
  imagen_url text
);

-- 2. Asegurarnos que la tabla NO tenga bloqueos de seguridad (RLS)
ALTER TABLE public.servicios DISABLE ROW LEVEL SECURITY;

-- 3. FORZAR permisos de lectura y escritura para la web (crucial para Vercel)
GRANT ALL ON TABLE public.servicios TO anon;
GRANT ALL ON TABLE public.servicios TO authenticated;
GRANT ALL ON TABLE public.servicios TO service_role;

-- 4. Crear la tabla de notificaciones si no existe
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  mensaje text NOT NULL,
  tipo text DEFAULT 'info',
  leida boolean DEFAULT false
);

-- 5. Asegurarnos que notificaciones NO tenga bloqueos
ALTER TABLE public.notificaciones DISABLE ROW LEVEL SECURITY;

-- 6. FORZAR permisos para notificaciones
GRANT ALL ON TABLE public.notificaciones TO anon;
GRANT ALL ON TABLE public.notificaciones TO authenticated;
GRANT ALL ON TABLE public.notificaciones TO service_role;

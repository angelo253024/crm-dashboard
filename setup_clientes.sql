-- 1. Crear la tabla de clientes si no existe
CREATE TABLE IF NOT EXISTS public.clientes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  nombre text NOT NULL,
  telefono text NOT NULL UNIQUE,
  vehiculo text,
  direccion text
);

-- 2. Asegurarnos que la tabla NO tenga bloqueos de seguridad (RLS)
ALTER TABLE public.clientes DISABLE ROW LEVEL SECURITY;

-- 3. FORZAR permisos de lectura y escritura
GRANT ALL ON TABLE public.clientes TO anon;
GRANT ALL ON TABLE public.clientes TO authenticated;
GRANT ALL ON TABLE public.clientes TO service_role;

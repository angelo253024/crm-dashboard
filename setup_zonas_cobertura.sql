-- =====================================================================================
-- INFRAESTRUCTURA DE COBERTURA DE SERVICIO (GEOFENCING) - FASE 2
-- Arquitectura escalable para manejar múltiples geocercas
-- =====================================================================================

-- 1. Crear tabla principal de zonas de cobertura
CREATE TABLE IF NOT EXISTS public.zonas_cobertura (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    nombre text NOT NULL,
    coordenadas jsonb NOT NULL, -- Almacenará un array de objetos {lat, lng} representando los vértices del polígono
    activa boolean DEFAULT true,
    color text DEFAULT '#1ca9c9', -- Color visual en el mapa para futuras zonas premium/diferenciadas
    descripcion text
);

-- 2. Eliminar bloqueos de seguridad por defecto para permitir acceso desde el cliente (Arquitectura actual)
ALTER TABLE public.zonas_cobertura DISABLE ROW LEVEL SECURITY;

-- 3. Otorgar permisos de lectura y escritura para la web (Crucial para Vercel)
GRANT ALL ON TABLE public.zonas_cobertura TO anon;
GRANT ALL ON TABLE public.zonas_cobertura TO authenticated;
GRANT ALL ON TABLE public.zonas_cobertura TO service_role;

-- Listo! Infraestructura de base de datos preparada para FASE 2.

-- =====================================================================================
-- MÓDULO DE REFERENCIA DE DOMICILIO Y PROPINAS DE TRABAJADORES
-- Este script agrega las columnas 'descripcion' y 'propina' a reservas.
-- Es 100% seguro (IF NOT EXISTS) y no altera ni borra ningún dato previo.
-- =====================================================================================

-- 1. Añadir columna 'descripcion' (referencia del domicilio para no perderse)
ALTER TABLE public.reservas 
ADD COLUMN IF NOT EXISTS descripcion TEXT;

-- 2. Añadir columna 'propina' (monto opcional registrado por el trabajador al cobrar)
ALTER TABLE public.reservas 
ADD COLUMN IF NOT EXISTS propina NUMERIC DEFAULT 0;

-- 3. Comentarios explicativos
COMMENT ON COLUMN public.reservas.descripcion IS 'Descripción o referencia del domicilio ingresada obligatoriamente por el cliente para evitar extravíos del trabajador';
COMMENT ON COLUMN public.reservas.propina IS 'Monto de propina opcional registrado por el trabajador al cobrar';

-- 1. Añadir columna cliente_onesignal_id a reservas (si no existe)
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS cliente_onesignal_id text;

-- 2. Crear la función del trigger para notificaciones de chat
CREATE OR REPLACE FUNCTION notificar_mensaje_chat()
RETURNS TRIGGER AS $$
DECLARE
    v_onesignal_id text;
    v_payload jsonb;
    v_request_id bigint;
    v_trabajador_id uuid;
    v_cliente_nombre text;
BEGIN
    -- Determinar a quién enviarle el Push basado en quién envió el mensaje
    
    -- CASO 1: El TRABAJADOR escribe (rol = 'bot'). Le llega al CLIENTE.
    IF NEW.rol = 'bot' THEN
        -- Buscar el OneSignal ID del cliente asociado a esa sesión
        SELECT cliente_onesignal_id, cliente_nombre 
        INTO v_onesignal_id, v_cliente_nombre
        FROM public.reservas 
        WHERE (chat_session_id = NEW.session_id OR id::text = REPLACE(NEW.session_id, 'fallback_', ''))
          AND cliente_onesignal_id IS NOT NULL 
          AND cliente_onesignal_id != ''
        LIMIT 1;
        
        IF v_onesignal_id IS NOT NULL THEN
            v_payload := jsonb_build_object(
                'app_id', 'a3f26ad5-6743-4eae-b720-6e7b2b3a36c6',
                'include_player_ids', jsonb_build_array(v_onesignal_id),
                'headings', jsonb_build_object('en', 'Mensaje del Lavador', 'es', 'Mensaje del Lavador 🛵💬'),
                'contents', jsonb_build_object('en', NEW.contenido, 'es', NEW.contenido),
                'url', 'https://crm-dashboard-lavamovil.vercel.app/reservar?chat=' || NEW.session_id,
                'web_url', 'https://crm-dashboard-lavamovil.vercel.app/reservar?chat=' || NEW.session_id,
                'data', jsonb_build_object('session_id', NEW.session_id, 'open_chat', true),
                'chrome_web_icon', 'https://crm-dashboard-lavamovil.vercel.app/logo.png',
                'chrome_web_badge', 'https://crm-dashboard-lavamovil.vercel.app/favicon-32x32.png'
            );
        END IF;

    -- CASO 2: El CLIENTE escribe (rol = 'user'). Le llega al TRABAJADOR.
    ELSIF NEW.rol = 'user' THEN
        -- Encontrar al trabajador asignado a la reserva
        SELECT r.trabajador_id, r.cliente_nombre
        INTO v_trabajador_id, v_cliente_nombre
        FROM public.reservas r
        WHERE (r.chat_session_id = NEW.session_id OR r.id::text = REPLACE(NEW.session_id, 'fallback_', ''))
        LIMIT 1;

        IF v_trabajador_id IS NOT NULL THEN
            SELECT onesignal_id INTO v_onesignal_id 
            FROM public.trabajadores 
            WHERE id = v_trabajador_id AND onesignal_id IS NOT NULL AND onesignal_id != '';
            
            IF v_onesignal_id IS NOT NULL THEN
                v_payload := jsonb_build_object(
                    'app_id', 'a3f26ad5-6743-4eae-b720-6e7b2b3a36c6',
                    'include_player_ids', jsonb_build_array(v_onesignal_id),
                    'headings', jsonb_build_object('en', 'Mensaje de ' || COALESCE(v_cliente_nombre, 'Cliente'), 'es', 'Mensaje de ' || COALESCE(v_cliente_nombre, 'Cliente') || ' 💬'),
                    'contents', jsonb_build_object('en', NEW.contenido, 'es', NEW.contenido),
                    'url', 'https://crm-dashboard-lavamovil.vercel.app/dashboard',
                    'web_url', 'https://crm-dashboard-lavamovil.vercel.app/dashboard',
                    'data', jsonb_build_object('session_id', NEW.session_id, 'open_chat', true),
                    'chrome_web_icon', 'https://crm-dashboard-lavamovil.vercel.app/logo.png',
                    'chrome_web_badge', 'https://crm-dashboard-lavamovil.vercel.app/favicon-32x32.png'
                );
            END IF;
        END IF;
    END IF;

    -- Si tenemos a quién notificar, disparamos la petición a OneSignal usando pg_net
    IF v_onesignal_id IS NOT NULL THEN
        SELECT net.http_post(
            url:='https://onesignal.com/api/v1/notifications',
            headers:=jsonb_build_object(
                'Content-Type', 'application/json; charset=utf-8',
                'Authorization', 'Basic YOUR_ONESIGNAL_REST_API_KEY' -- Coloca aquí tu REST API Key de OneSignal (ej: os_v2_app_...)
            ),
            body:=v_payload
        ) INTO v_request_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear el Trigger en la tabla mensajes
DROP TRIGGER IF EXISTS trigger_onesignal_nuevo_mensaje ON public.mensajes;
CREATE TRIGGER trigger_onesignal_nuevo_mensaje
AFTER INSERT ON public.mensajes
FOR EACH ROW
EXECUTE FUNCTION notificar_mensaje_chat();

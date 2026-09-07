import OneSignal from 'react-onesignal';
import { supabase } from '../supabase';

export const ONESIGNAL_APP_ID = 'a3f26ad5-6743-4eae-b720-6e7b2b3a36c6';
export const ONESIGNAL_REST_KEY = typeof atob !== 'undefined'
  ? atob('b3NfdjJfYXBwX3Vwemd2dmxoaW5oazVuemFuejVzd29yd3kycXB0Y2EyN3d4dWdkNWtmbGNibmh0NWxudXhvNDYyaHBzanBiejNwaXE3cnljeTRncjJiMnYzNGRnY29rYXYzcmczamVsaHVhcDc0dmk=')
  : '';

/**
 * Obtiene el Push Subscription ID actual de OneSignal o del almacenamiento local.
 */
export const getPushSubscriptionId = () => {
  try {
    const fromOs = OneSignal.User?.PushSubscription?.id;
    if (fromOs) {
      localStorage.setItem('onesignal_push_id', fromOs);
      return fromOs;
    }
    return localStorage.getItem('onesignal_push_id') || null;
  } catch (e) {
    return localStorage.getItem('onesignal_push_id') || null;
  }
};

/**
 * Solicita permiso para notificaciones Push al usuario y espera a que OneSignal
 * genere y registre el ID de suscripción con los servidores de push.
 */
export const requestPushPermission = async () => {
  let granted = false;
  let pushId = null;

  try {
    if (typeof window !== 'undefined' && OneSignal.Notifications) {
      await OneSignal.Notifications.requestPermission();
      granted = !!OneSignal.Notifications.permission;
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      const res = await Notification.requestPermission();
      granted = res === 'granted';
    }

    // Esperar unos instantes para que OneSignal termine de hidratar la suscripción
    if (granted) {
      pushId = OneSignal.User?.PushSubscription?.id;
      if (!pushId) {
        // Breve espera de hidratación
        await new Promise(r => setTimeout(r, 1200));
        pushId = OneSignal.User?.PushSubscription?.id || localStorage.getItem('onesignal_push_id');
      }

      if (pushId) {
        localStorage.setItem('onesignal_push_id', pushId);
      }
    }
  } catch (err) {
    console.warn('Error solicitando permisos Push:', err);
  }

  return { granted, pushId };
};

/**
 * Sincroniza el Push Subscription ID en Supabase para las reservas del cliente.
 * Actualiza tanto por ID de reserva como por coincidencia de teléfono.
 */
export const syncPushIdToReservas = async (pushId, phone = null, reservationIds = []) => {
  if (!pushId) return;

  try {
    localStorage.setItem('onesignal_push_id', pushId);

    // 1. Sincronizar por IDs de reserva específicos
    if (Array.isArray(reservationIds) && reservationIds.length > 0) {
      await supabase
        .from('reservas')
        .update({ cliente_onesignal_id: pushId })
        .in('id', reservationIds.filter(Boolean));
    }

    // 2. Sincronizar por teléfono en reservas activas recientes
    if (phone && String(phone).replace(/\D/g, '').length >= 7) {
      const cleanPhone = String(phone).replace(/\D/g, '');
      await supabase
        .from('reservas')
        .update({ cliente_onesignal_id: pushId })
        .ilike('cliente_nombre', `%${cleanPhone}%`)
        .in('estado_reserva', ['pendiente', 'asignado', 'en_camino', 'en_proceso']);
    }
  } catch (err) {
    console.warn('Error sincronizando push ID con reservas:', err);
  }
};

/**
 * Envía una notificación Push DIRECTA al cliente mediante OneSignal REST API.
 * Funciona como doble garantía en caso de demoras en los triggers de PostgreSQL.
 */
export const sendDirectWorkerPush = async ({ targetPushId, workerName = 'Tu Lavador', message, sessionId }) => {
  if (!targetPushId || !message) return false;

  try {
    const cleanSession = (sessionId || '').trim();
    const chatUrl = `https://lavamovilnorte.vercel.app/reservar?chat=${encodeURIComponent(cleanSession)}`;

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: [targetPushId],
      include_subscription_ids: [targetPushId],
      headings: {
        es: `Mensaje de ${workerName} 🛵💬`,
        en: `Mensaje de ${workerName} 🛵💬`
      },
      contents: {
        es: message,
        en: message
      },
      url: chatUrl,
      web_url: chatUrl,
      data: {
        session_id: cleanSession,
        open_chat: true
      },
      chrome_web_icon: 'https://lavamovilnorte.vercel.app/logo.png',
      chrome_web_badge: 'https://lavamovilnorte.vercel.app/favicon-32x32.png',
      priority: 10,
      ttl: 86400
    };

    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${ONESIGNAL_REST_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    return res.ok && (!result.errors || result.errors.length === 0);
  } catch (err) {
    console.warn('Error enviando push directo al cliente:', err);
    return false;
  }
};

import { supabase } from '../../supabase';

// GeminiService — Auto-detecta el mejor modelo disponible para tu clave de API y responde con máxima velocidad y empatía
export const GEMINI_ERROR_MARKER = '__GEMINI_ERROR__';

// Cache del modelo descubierto para no consultar la lista en cada mensaje
let _cachedModel = null;

// Intentar recuperar de sessionStorage para evitar roundtrips de red en recargas
try {
  if (typeof sessionStorage !== 'undefined') {
    _cachedModel = sessionStorage.getItem('gemini_best_model');
  }
} catch (e) {}

/**
 * Consulta la API y devuelve el mejor modelo de generación disponible.
 * Prioriza modelos flash rápidos y estables.
 */
async function detectBestModel(apiKey) {
  if (_cachedModel) return _cachedModel;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn('⚠️ No se pudo obtener la lista de modelos:', res.status);
      _cachedModel = 'gemini-2.5-flash';
      return _cachedModel;
    }

    const data = await res.json();
    const models = data.models || [];

    // Filtrar solo los que soportan generateContent
    const generative = models
      .filter(m =>
        m.supportedGenerationMethods?.includes('generateContent') &&
        !m.name.includes('embedding') &&
        !m.name.includes('aqa')
      )
      .map(m => m.name.replace('models/', ''));

    // Orden de preferencia: modelos flash actuales y ultra rápidos primero
    const PRIORITY = [
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.1-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.6-flash',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-3.5-pro',
      'gemini-2.5-pro',
      'gemini-pro',
    ];

    for (const preferred of PRIORITY) {
      const found = generative.find(m => m.startsWith(preferred));
      if (found) {
        _cachedModel = found;
        try { sessionStorage.setItem('gemini_best_model', found); } catch(e) {}
        return found;
      }
    }

    if (generative.length > 0) {
      _cachedModel = generative[0];
      try { sessionStorage.setItem('gemini_best_model', _cachedModel); } catch(e) {}
      return _cachedModel;
    }

  } catch (e) {
    console.warn('⚠️ Fallback a modelo estándar por timeout o error de red:', e.message);
  }

  // Fallback seguro predeterminado
  _cachedModel = 'gemini-2.5-flash';
  return _cachedModel;
}

export class GeminiService {
  static async getCompletion(prompt, context = "") {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      console.error('❌ VITE_GEMINI_API_KEY no encontrada.');
      return GEMINI_ERROR_MARKER;
    }

    // --- ANTI-SPAM OPTIMIZADO (Verificación Instantánea Local + Sync Asíncrono) ---
    let deviceId = localStorage.getItem('chatbot_device_id');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('chatbot_device_id', deviceId);
    }
    
    const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const localUsageKey = `usage_${deviceId}_${todayStr}`;
    const localCount = parseInt(localStorage.getItem(localUsageKey) || '0', 10);

    if (localCount >= 35) {
      console.warn('Límite de mensajes alcanzado localmente para:', deviceId);
      return "⚠️ Has alcanzado tu límite de mensajes gratuitos por hoy. Por favor contáctanos directamente por llamada o WhatsApp si necesitas más asistencia personalizada. ¡Estaremos felices de atenderte!";
    }

    // Incrementar contador local de inmediato (0ms de latencia)
    localStorage.setItem(localUsageKey, (localCount + 1).toString());

    // Sincronizar con Supabase en segundo plano sin bloquear la respuesta de la IA
    (async () => {
      try {
        await supabase
          .from('chatbot_usage')
          .upsert({
            device_id: deviceId,
            fecha: todayStr,
            mensajes_enviados: localCount + 1
          }, { onConflict: 'device_id, fecha' });
      } catch (err) {
        // Silencioso en fondo para no degradar experiencia
      }
    })();
    // --- FIN ANTI-SPAM OPTIMIZADO ---

    // Detectar modelo (ultrarrápido con caché en memoria/sesión)
    const modelName = await detectBestModel(apiKey);

    if (!modelName) {
      return GEMINI_ERROR_MARKER;
    }

    const systemMessage = `Eres el asesor y concierge virtual estrella de "Lavamóvil Norte", el servicio líder de lavado y detallado automotriz a domicilio en Santa Cruz de la Sierra.

🌟 TU PERSONALIDAD:
- Eres sumamente educado, cálido, empático, profesional y carismático.
- Tratas al cliente con respeto y entusiasmo ("¡Con mucho gusto!", "¡Excelente elección!", "Será un placer ayudarte", "¡Hola! Qué gusto saludarte").
- Transmites confianza y seguridad absoluta sobre la calidad de nuestros servicios y el cuidado de los vehículos.
- Utilizas emojis elegantes (🚗, ✨, 💧, 🧼, 🛡️, 📅) de forma natural para que las respuestas sean atractivas y fáciles de leer.

📋 INFORMACIÓN DEL NEGOCIO Y SERVICIOS EN TIEMPO REAL:
${context}

💎 CONOCIMIENTO CLAVE DE NUESTRO SERVICIO:
1. 💧 SERVICIO A DOMICILIO Y REQUISITOS: Vamos hasta la comodidad de tu hogar, condominio u oficina.
   - Solo necesitamos que el cliente nos facilite:
     • **1 toma de agua (grifo o canilla)** 🚰
     • **1 toma de corriente o enchufe disponible** 🔌
   - Nosotros llevamos todo el equipamiento: extensiones largas de uso rudo, mangueras profesionales, hidrolavadoras de alta presión, aspiradoras industriales y todos los insumos de grado automotriz. ¡El cliente no tiene que preocuparse por nada más!
2. 🧼 SERVICIOS Y PAQUETES:
   - **Lavado Clásico**: Lavado exterior con shampoo con cera biodegradable, secado con microfibra, aspirado profundo de interiores y maletero, limpieza de tablero/molduras, hidratación de llantas y aromatizante.
   - **Lavado Premium (El más solicitado)**: Todo lo del clásico + encerado protector con cera de alta duración, hidratación profunda de plásticos exteriores y molduras, limpieza profunda de vidrios anti-reflejo y desinfección de ductos de A/C.
   - **Servicios Especiales**: Lavado de tapicería a vapor / inyección-extracción, limpieza detallada de motor en seco, pulido y encerado a máquina, descontaminado de pintura.
3. 🎯 PRECIOS EXACTOS POR TAMAÑO:
   - Si el cliente menciona su vehículo (ej. Suzuki Swift, Toyota Hilux, RAV4, Moto), identifica su tamaño (P=Pequeño, M=Mediano, L=Grande, XL=Extra Grande/Pickup, MOTO) y dale los precios EXACTOS y claros para su tamaño. Usa viñetas limpias con emojis.
   - Si no menciona el vehículo, puedes darle un rango amigable o preguntarle qué vehículo tiene para darle el precio exacto.
4. ⏱️ TIEMPOS ESTIMADOS: Un lavado estándar toma aproximadamente 45 min a 1 hora (según tamaño). Servicios completos de tapicería o premium 1.5 a 2 horas.
5. 💳 PAGOS Y COBERTURA: Aceptamos QR, Transferencia bancaria y Efectivo. Cubrimos toda la zona urbana de Santa Cruz de la Sierra hasta el 8vo anillo y condominios.
6. 🕒 HORARIOS DE ATENCIÓN: Atendemos de Lunes a Sábado de 07:30 AM a 06:00 PM (7:30 - 18:00). Los Domingos estamos cerrados.

🚨 REGLAS CRÍTICAS DE RESPUESTA:
- Sé conciso pero muy claro y atento.
- Cierra tus respuestas de manera proactiva invitando a agendar o resolver cualquier otra duda (ej. "¿Te gustaría que agendemos tu cita para dejar tu vehículo como nuevo? ✨").
- 🗓️ [INICIAR_RESERVA]: SOLO si el cliente muestra una intención clara de querer agendar o reservar (ej. "quiero agendar", "reservar para hoy/mañana", "sí, por favor agéndame", "quiero una cita"), incluye al final de tu mensaje la etiqueta exacta: [INICIAR_RESERVA]
- 📞 [BOTON_WHATSAPP]: Si el cliente solicita explícitamente hablar con una persona humana, soporte directo o temas de convenios/flotas corporativas, agrega al final: [BOTON_WHATSAPP]`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemMessage }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { 
              temperature: 0.6, 
              maxOutputTokens: 450,
              topP: 0.95
            }
          })
        }
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        console.error(`❌ Gemini ${modelName} error:`, JSON.stringify(errorBody));
        _cachedModel = null;
        try { sessionStorage.removeItem('gemini_best_model'); } catch(e) {}
        return GEMINI_ERROR_MARKER;
      }

      const data = await response.json();
      const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) {
        return GEMINI_ERROR_MARKER;
      }

      return textResponse.trim();

    } catch (error) {
      console.error('❌ Error de red en GeminiService:', error.message);
      _cachedModel = null;
      try { sessionStorage.removeItem('gemini_best_model'); } catch(e) {}
      return GEMINI_ERROR_MARKER;
    }
  }
}

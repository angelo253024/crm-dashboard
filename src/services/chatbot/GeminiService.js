import { supabase } from '../../supabase';

// GeminiService — Auto-detecta el mejor modelo disponible para tu clave de API
export const GEMINI_ERROR_MARKER = '__GEMINI_ERROR__';

// Cache del modelo descubierto para no consultar la lista en cada mensaje
let _cachedModel = null;

/**
 * Consulta la API y devuelve el mejor modelo de generación disponible.
 * Prioriza modelos flash/pro más recientes.
 */
async function detectBestModel(apiKey) {
  if (_cachedModel) return _cachedModel;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (!res.ok) {
      console.error('❌ No se pudo obtener la lista de modelos:', res.status);
      return null;
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

    console.log('📋 Modelos disponibles:', generative);

    // Orden de preferencia: modelos 3.x actuales primero
    const PRIORITY = [
      'gemini-3.5-flash-lite',    // Rápido — ideal para chatbot
      'gemini-3.5-flash',
      'gemini-3.1-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.6-flash',
      'gemini-3.5-pro',
      'gemini-3.1-pro',
      'gemini-2.5-flash',         // Legacy (retiro oct 2026)
      'gemini-2.5-flash-lite',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-pro',
    ];

    for (const preferred of PRIORITY) {
      const found = generative.find(m => m.startsWith(preferred));
      if (found) {
        console.log(`✅ Mejor modelo seleccionado: ${found}`);
        _cachedModel = found;
        return found;
      }
    }

    // Si no coincide ninguno de los preferidos, usar el primero disponible
    if (generative.length > 0) {
      _cachedModel = generative[0];
      console.log(`✅ Usando primer modelo disponible: ${_cachedModel}`);
      return _cachedModel;
    }

  } catch (e) {
    console.error('❌ Error listando modelos Gemini:', e.message);
  }

  return null;
}

export class GeminiService {
  static async getCompletion(prompt, context = "") {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    // --- ANTI-SPAM LOGIC ---
    let deviceId = localStorage.getItem('chatbot_device_id');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('chatbot_device_id', deviceId);
    }
    
    // Obtener fecha actual en formato YYYY-MM-DD (hora local)
    const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    
    try {
      const { data: usageData, error: readError } = await supabase
        .from('chatbot_usage')
        .select('*')
        .eq('device_id', deviceId)
        .eq('fecha', todayStr)
        .maybeSingle();

      if (usageData && usageData.mensajes_enviados >= 30) {
        console.warn('Límite de mensajes alcanzado para el dispositivo:', deviceId);
        return "⚠️ Has alcanzado tu límite de mensajes gratuitos por hoy. Por favor contáctanos por llamada o WhatsApp si necesitas más ayuda, o vuelve a intentarlo mañana.";
      }

      // Incrementar contador
      const newCount = usageData ? usageData.mensajes_enviados + 1 : 1;
      
      const payload = {
        device_id: deviceId,
        fecha: todayStr,
        mensajes_enviados: newCount
      };
      
      if (usageData && usageData.id) {
        payload.id = usageData.id;
      }
      
      await supabase
        .from('chatbot_usage')
        .upsert(payload, { onConflict: 'device_id, fecha' });

    } catch (err) {
      console.error('Error en validación anti-spam:', err);
      // Si falla la validación por error de red, permitimos el mensaje para no degradar el servicio
    }
    // --- END ANTI-SPAM LOGIC ---

    if (!apiKey) {
      console.error('❌ VITE_GEMINI_API_KEY no encontrada.');
      return GEMINI_ERROR_MARKER;
    }

    // Detectar automáticamente el mejor modelo disponible para esta clave
    const modelName = await detectBestModel(apiKey);

    if (!modelName) {
      console.error('❌ No se encontró ningún modelo disponible para esta clave.');
      return GEMINI_ERROR_MARKER;
    }

    const systemMessage = `Eres el asistente virtual estrella de "Lavamóvil Norte", un servicio premium de lavado de vehículos a domicilio.
Tu objetivo es brindar una atención al cliente excepcional, amable, persuasiva y muy clara. Respondes de forma concisa y en español.

INFORMACIÓN DEL NEGOCIO EN TIEMPO REAL:
${context}

REGLAS DE ORO PARA TUS RESPUESTAS:
1. 🎯 PRECIOS EXACTOS POR VEHÍCULO: Si el cliente menciona su vehículo (ej. Toyota Tundra, Suzuki Swift, Moto), detecta su tamaño (P=Pequeño, M=Mediano, L=Grande, XL=Extra Grande, Moto) y dale los precios EXACTOS para su tamaño. Usa viñetas atractivas con emojis (ej. 🧼 Lavado Clásico: Bs. X, ⭐ Lavado Premium: Bs. Y). Nunca lo confundas mostrándole todos los tamaños.
2. 📅 FECHAS Y HORARIOS DISPONIBLES: Si el cliente pregunta por fechas o disponibilidad, revisa la "FECHA Y HORA ACTUAL" provista en la información. Ofrécele disponibilidad para hoy mismo (si estamos dentro del horario) o para los días siguientes según los "HORARIOS DE ATENCIÓN". Usa un tono proactivo: "¡Claro! Tenemos disponibilidad para hoy mismo o si gustas mañana."
3. 💬 TONO DE VENTAS: Sé amigable, entusiasta y útil. Usa emojis para que el texto respire (🚗, ✨, 💧). Si solo pide precios, dáselos de forma estructurada y cierra siempre preguntando algo relajado como: "¿Te gustaría que te agende una cita para dejar tu vehículo impecable?"
4. 🗓️ CÓMO INICIAR UNA RESERVA (CRÍTICO): SOLO si el cliente muestra una intención CLARA de querer agendar (ej. "quiero reservar", "agendar para mañana", "sí, agéndame"), DEBES escribir EXACTAMENTE la etiqueta [INICIAR_RESERVA] al final de tu respuesta. Esto activa nuestro sistema automático. Nunca lo pongas si solo están preguntando precios.
5. 📞 ASESOR HUMANO: Si el cliente pide explícitamente hablar con un humano, operador, asesor, o hace preguntas complejas que no puedes responder (reclamos, convenios, etc.), ofrécele hablar con un asesor e incluye EXACTAMENTE esta etiqueta al final de tu respuesta: [BOTON_WHATSAPP].`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemMessage }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 400 }
          })
        }
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        console.error(`❌ Gemini ${modelName} error:`, JSON.stringify(errorBody));
        // Resetear caché para que reintente con otro modelo la próxima vez
        _cachedModel = null;
        return GEMINI_ERROR_MARKER;
      }

      const data = await response.json();
      const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) {
        console.warn('⚠️ Gemini respondió sin texto:', JSON.stringify(data));
        return GEMINI_ERROR_MARKER;
      }

      return textResponse.trim();

    } catch (error) {
      console.error('❌ Error de red en GeminiService:', error.message);
      _cachedModel = null;
      return GEMINI_ERROR_MARKER;
    }
  }
}

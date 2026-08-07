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

    // Orden de preferencia: flash más reciente primero, luego pro, luego legacy
    const PRIORITY = [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.0-pro',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
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
  static async getCompletion(prompt) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

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

    const systemMessage = `Eres el asistente virtual experto del CRM "Lavamóvil Norte".
Respondes preguntas de los clientes y dueños de manera amable, profesional y precisa.
Tus respuestas deben ser concisas y en español. Estás diseñado para ayudar en un Car Wash/Lavadero de vehículos.
Nunca inventes precios o servicios si no estás seguro.`;

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

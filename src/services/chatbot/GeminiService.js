// GeminiService v3 — Auto-fallback entre modelos Gemini 2.x/1.5/pro

// Flag interno: si Gemini falla, marcamos para NO cachear esa respuesta
export const GEMINI_ERROR_MARKER = '__GEMINI_ERROR__';

export class GeminiService {
  static async getCompletion(prompt) {
    // 1. Obtenemos la llave desde las variables de entorno (solo disponible si empieza con VITE_)
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('❌ VITE_GEMINI_API_KEY no encontrada. Verifica tu .env local o las Environment Variables de Vercel.');
      return GEMINI_ERROR_MARKER;
    }

    console.log(`🔑 Usando clave Gemini: ${apiKey.substring(0, 8)}...`);

    // 2. Instrucciones base (System Prompt)
    const systemMessage = `Eres el asistente virtual experto del CRM "Lavamóvil Norte".
Respondes preguntas de los clientes y dueños de manera amable, profesional y precisa.
Tus respuestas deben ser concisas y en español. Estás diseñado para ayudar en un Car Wash/Lavadero de vehículos.
Nunca inventes precios o servicios si no estás seguro.`;

    // Lista de modelos a intentar en orden (el primero disponible gana)
    const MODELS_TO_TRY = [
      'gemini-2.0-flash',           // Modelos nuevos (2.x)
      'gemini-2.0-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash-latest',    // Modelos 1.5
      'gemini-1.5-flash',
      'gemini-pro',                 // Modelos legacy
      'gemini-1.0-pro',
    ];

    let lastError = '';

    for (const modelName of MODELS_TO_TRY) {
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

        if (response.status === 404) {
          // Modelo no disponible — probar el siguiente
          lastError = `Model ${modelName} not found`;
          console.warn(`⚠️ Modelo ${modelName} no disponible, probando siguiente...`);
          continue;
        }

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          lastError = errorBody?.error?.message || `HTTP ${response.status}`;
          console.error(`❌ Gemini ${modelName} error:`, lastError);
          continue;
        }

        const data = await response.json();
        const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (textResponse) {
          console.log(`✅ Gemini respondió con modelo: ${modelName}`);
          return textResponse.trim();
        }

      } catch (networkError) {
        lastError = networkError.message;
        console.error(`❌ Error de red con ${modelName}:`, networkError.message);
      }
    }

    // Si ningún modelo funcionó
    console.error('❌ Ningún modelo de Gemini estuvo disponible. Último error:', lastError);
    return GEMINI_ERROR_MARKER;

  }
}

/**
 * Servicio exclusivo para conectarse a Google Gemini usando la API REST (fetch).
 * Motor principal de IA del CRM Lavamóvil Norte.
 */

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

    // Validación básica: las claves de Gemini/Google AI Studio empiezan con "AIza"
    if (!apiKey.startsWith('AIza')) {
      console.error(`❌ La clave de Gemini tiene formato inválido. Debe empezar con "AIza". Valor actual: ${apiKey.substring(0, 6)}...`);
      return GEMINI_ERROR_MARKER;
    }

    // 2. Instrucciones base (System Prompt)
    const systemMessage = `Eres el asistente virtual experto del CRM "Lavamóvil Norte".
Respondes preguntas de los clientes y dueños de manera amable, profesional y precisa.
Tus respuestas deben ser concisas y en español. Estás diseñado para ayudar en un Car Wash/Lavadero de vehículos.
Nunca inventes precios o servicios si no estás seguro.`;

    try {
      // 3. Petición a la API REST de Gemini 1.5 Flash
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemMessage }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 400,
            }
          })
        }
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        console.error(`❌ Gemini API HTTP ${response.status}:`, JSON.stringify(errorBody));
        return GEMINI_ERROR_MARKER;
      }

      const data = await response.json();
      
      // 4. Extraemos el texto generado
      const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textResponse) {
        console.warn('⚠️ Gemini respondió OK pero sin texto:', JSON.stringify(data));
        return GEMINI_ERROR_MARKER;
      }

      return textResponse.trim();

    } catch (error) {
      console.error('❌ Error de red en GeminiService:', error.message);
      return GEMINI_ERROR_MARKER;
    }
  }
}

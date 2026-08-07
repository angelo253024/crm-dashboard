/**
 * Servicio exclusivo para conectarse a Google Gemini usando la API REST (fetch).
 * Sustituye a OpenAI como motor de razonamiento principal.
 */
export class GeminiService {
  static async getCompletion(prompt) {
    // 1. Obtenemos la llave desde las variables de entorno
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn("⚠️ No se encontró VITE_GEMINI_API_KEY. Configúrala en tu archivo .env");
      return "Lo siento, soy un asistente en fase de entrenamiento y en este momento no puedo conectarme a mi motor de razonamiento (Gemini). ¿Hay algo más en lo que pueda ayudarte?";
    }

    // 2. Instrucciones base (Prompt del Sistema)
    const systemMessage = `Eres el asistente virtual experto del CRM "Lavamóvil Norte".
Respondes preguntas de los clientes y dueños de manera amable, profesional y precisa.
Tus respuestas deben ser concisas. Estás diseñado para ayudar en un Car Wash/Lavadero de vehículos.
Nunca inventes precios o servicios si no estás seguro.`;

    try {
      // 3. Hacemos la petición HTTP a la API de Gemini 1.5 Flash
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemMessage }]
          },
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 300,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      
      // 4. Extraemos el texto de la respuesta
      const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      return textResponse || "Lo siento, no pude generar una respuesta en este momento.";
    } catch (error) {
      console.error("Error en GeminiService:", error);
      return "Hubo un pequeño error procesando tu solicitud con Gemini. Por favor intenta de nuevo más tarde.";
    }
  }
}

/**
 * Servicio exclusivo para conectarse a OpenAI usando fetch.
 * Solo se debe invocar si la respuesta no existe localmente ni en caché.
 */
export class OpenAIService {
  static async getCompletion(prompt) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      console.warn("⚠️ No se encontró VITE_OPENAI_API_KEY. Configúrala en tu entorno para que el bot pueda razonar.");
      return "Lo siento, soy un asistente en fase de entrenamiento y en este momento no puedo conectarme a mi motor de razonamiento avanzado. ¿Hay algo más en lo que pueda ayudarte sobre los servicios, precios o reservas?";
    }

    const systemMessage = `
Eres el asistente virtual experto del CRM "Lavamóvil Norte".
Respondes preguntas de los clientes y dueños de manera amable, profesional y precisa.
Tus respuestas deben ser concisas. Estás diseñado para ayudar en un Car Wash/Lavadero de vehículos.
Nunca inventes precios o servicios si no estás seguro.
`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo', // Se puede cambiar a gpt-4o si se desea
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 200
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Error en OpenAIService:", error);
      return "Hubo un pequeño error procesando tu solicitud compleja. Por favor intenta de nuevo más tarde.";
    }
  }
}

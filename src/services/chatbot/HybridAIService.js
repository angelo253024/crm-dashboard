import { IntentClassifier } from './IntentClassifier';
import { SupabaseQueryService } from './SupabaseQueryService';
import { CacheService } from './CacheService';
import { GeminiService } from './GeminiService';
import { supabase } from '../../supabase';
import { v4 as uuidv4 } from 'uuid'; // Fallback if no uuid, but we can just use standard JS random or session string

/**
 * Servicio Orquestador del Bot.
 * Sigue el patrón Facade para manejar toda la lógica híbrida del chatbot.
 */
export class HybridAIService {
  
  /**
   * Genera una respuesta inteligente combinando Bases de Datos, Caché y OpenAI.
   * @param {string} userMessage - Mensaje del usuario
   * @param {string} sessionId - ID de la sesión actual
   * @param {function} onStatusUpdate - Callback para actualizar UI ('pensando', 'consultando', etc)
   */
  static async processMessage(userMessage, sessionId = 'web-session', onStatusUpdate = () => {}) {
    const startTime = Date.now();
    let finalResponse = "";
    let source = "";

    try {
      onStatusUpdate("Analizando intención...");
      const intent = await IntentClassifier.classify(userMessage);

      onStatusUpdate("Consultando Base de Datos...");
      // 1. Intentar responder desde Supabase (Reglas, FAQ, Tablas de negocio)
      const localResponse = await SupabaseQueryService.getResponseForIntent(intent);
      
      if (localResponse) {
        finalResponse = localResponse;
        source = 'supabase';
      } else {
        // 2. Si no hay respuesta local, intentar en Caché de IA
        onStatusUpdate("Revisando memoria caché...");
        const cachedResponse = await CacheService.getCachedResponse(userMessage);

        if (cachedResponse) {
          finalResponse = cachedResponse;
          source = 'cache';
        } else {
          // 3. Si no hay caché, usar Gemini
          onStatusUpdate("Pensando (IA)...");
          const aiResponse = await GeminiService.getCompletion(userMessage);
          
          finalResponse = aiResponse;
          source = 'gemini';

          // Guardar en caché para futuras consultas asíncronamente
          CacheService.saveToCache(userMessage, aiResponse).catch(e => console.error("Cache save error", e));
        }
      }

    } catch (error) {
      console.error("Error en HybridAIService:", error);
      finalResponse = "Ocurrió un error inesperado al procesar tu mensaje.";
      source = 'error';
    }

    const durationMs = Date.now() - startTime;

    // Guardar en el historial de forma asíncrona (No bloquea la UI)
    this.saveToHistory(sessionId, userMessage, finalResponse, source, durationMs).catch(e => console.error("History save error", e));

    onStatusUpdate(""); // Limpiar estado
    return {
      text: finalResponse,
      source: source
    };
  }

  /**
   * Guarda el log de auditoría en la tabla bot_historial
   */
  static async saveToHistory(sessionId, pregunta, respuesta, origen, tiempo_ms) {
    await supabase.from('bot_historial').insert([{
      session_id: sessionId,
      pregunta: pregunta,
      respuesta: respuesta,
      origen: origen,
      tiempo_ms: tiempo_ms
    }]);
  }
}

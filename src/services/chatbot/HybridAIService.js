import { IntentClassifier } from './IntentClassifier';
import { SupabaseQueryService } from './SupabaseQueryService';
import { CacheService } from './CacheService';
import { GeminiService, GEMINI_ERROR_MARKER } from './GeminiService';
import { ChatBotReservationService } from './ChatBotReservationService';
import { supabase } from '../../supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Servicio Orquestador del Bot.
 * Sigue el patrón Facade para manejar toda la lógica híbrida del chatbot.
 */
export class HybridAIService {
  
  /**
   * Genera una respuesta inteligente combinando Reservas, BDD, Caché y Gemini.
   * @param {string} userMessage - Mensaje del usuario
   * @param {string} sessionId - ID de la sesión actual
   * @param {function} onStatusUpdate - Callback para actualizar UI
   */
  static async processMessage(userMessage, sessionId = 'web-session', onStatusUpdate = () => {}) {
    const startTime = Date.now();
    let finalResponse = "";
    let source = "";
    let buttons = null;
    let requestGPS = false;
    let reservaExtra = null;

    try {
      // ========== PRIORIDAD 0: ¿Hay una reserva en curso? ==========
      if (ChatBotReservationService.isActive()) {
        onStatusUpdate("Procesando reserva...");
        const result = await ChatBotReservationService.processStep(userMessage);
        if (result) {
          finalResponse = result.text;
          source = result.source;
          buttons = result.buttons || null;
          requestGPS = result.requestGPS || false;
          if (result.chatSessionId) {
            reservaExtra = { chatSessionId: result.chatSessionId, reservaId: result.reservaId };
          }
        } else {
          finalResponse = "Algo salió mal con la reserva. Intenta de nuevo.";
          source = 'error';
        }
      } else {
        // ========== FLUJO NORMAL ==========
        onStatusUpdate("Analizando intención...");
        const intent = await IntentClassifier.classify(userMessage);

        // ¿El usuario quiere reservar?
        if (intent === 'reservar') {
          onStatusUpdate("Iniciando reserva...");
          const result = ChatBotReservationService.start();
          finalResponse = result.text;
          source = result.source;
          buttons = result.buttons || null;
          requestGPS = result.requestGPS || false;
        } else {
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
              const context = await SupabaseQueryService.getBusinessContext();
              const aiResponse = await GeminiService.getCompletion(userMessage, context);
              
              if (aiResponse === GEMINI_ERROR_MARKER) {
                finalResponse = "En este momento no puedo conectarme a mi motor de IA. Por favor verifica la configuración de Gemini o intenta más tarde.";
                source = 'error-gemini';
              } else {
                if (aiResponse.includes('[INICIAR_RESERVA]')) {
                  onStatusUpdate("Iniciando reserva...");
                  const result = ChatBotReservationService.start();
                  finalResponse = aiResponse.replace('[INICIAR_RESERVA]', '').trim() + '\n\n' + result.text;
                  source = result.source;
                  buttons = result.buttons || null;
                  requestGPS = result.requestGPS || false;
                } else {
                  finalResponse = aiResponse;
                  source = 'gemini';
                  CacheService.saveToCache(userMessage, aiResponse).catch(e => console.error("Cache save error", e));
                }
              }
            }
          }
        }
      }

    } catch (error) {
      console.error("Error en HybridAIService:", error);
      finalResponse = "Ocurrió un error inesperado al procesar tu mensaje.";
      source = 'error';
    }

    const durationMs = Date.now() - startTime;
    this.saveToHistory(sessionId, userMessage, finalResponse, source, durationMs).catch(e => console.error("History save error", e));
    onStatusUpdate("");

    return {
      text: finalResponse,
      source: source,
      buttons: buttons,
      requestGPS: requestGPS,
      reservaExtra: reservaExtra,
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

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
    let wasReservationCancelled = false;

    try {

      // ========== PRIORIDAD 0: ¿Hay una reserva en curso? ==========
      if (ChatBotReservationService.isActive()) {
        const lowerMsg = userMessage.toLowerCase().trim();
        const isCancelPhrase = (
          ['cancelar', 'salir', 'no', 'cancelar reserva', 'cancel', 'abortar', 'pausar', 'parar', 'menu', 'atras', 'atrás', 'volver'].includes(lowerMsg) ||
          lowerMsg.includes('cancelar') ||
          lowerMsg.includes('consultar') ||
          lowerMsg.includes('pregunta') ||
          lowerMsg.includes('otra cosa') ||
          lowerMsg.includes('otra duda') ||
          lowerMsg.includes('quiero saber') ||
          lowerMsg.includes('no quiero') ||
          lowerMsg.includes('después') ||
          lowerMsg.includes('luego') ||
          lowerMsg.includes('espera')
        );

        const intentPreCheck = await IntentClassifier.classify(userMessage);
        
        // Si el usuario cancela o hace otra consulta conocida, cancelamos la reserva
        if (isCancelPhrase || (intentPreCheck !== 'UNKNOWN' && intentPreCheck !== 'reservar')) {
          ChatBotReservationService.cancel();
          if (intentPreCheck !== 'UNKNOWN' && intentPreCheck !== 'reservar') {
            wasReservationCancelled = true;
          } else if (isCancelPhrase && (lowerMsg.includes('consultar') || lowerMsg.includes('pregunta') || lowerMsg.includes('otra cosa'))) {
            finalResponse = "❌ Reserva pausada. ¿Qué otra consulta tienes? Con gusto te ayudo. ✨";
            source = 'reservation';
          } else {
            finalResponse = "❌ Reserva cancelada. Si necesitas algo más, ¡aquí estoy para ayudarte! ✨";
            source = 'reservation';
          }
        } else {
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
        }
      }

      // Si no hay reserva (o fue cancelada arriba) y aún no hay respuesta
      if (!ChatBotReservationService.isActive() && finalResponse === "") {
        // ¿El usuario presionó un botón de FAST_BOOK (Cierre Rápido)?
        if (typeof userMessage === 'string' && userMessage.startsWith('FAST_BOOK|')) {
          const parts = userMessage.split('|');
          const pDate = parts[1];
          const pTime = parts[2];
          onStatusUpdate("Iniciando reserva rápida...");
          const result = ChatBotReservationService.start(pDate, pTime);
          finalResponse = result.text;
          source = result.source;
          buttons = result.buttons || null;
          requestGPS = result.requestGPS || false;
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
              if (typeof localResponse === 'object' && localResponse.text) {
                finalResponse = localResponse.text;
                buttons = localResponse.buttons || null;
              } else {
                finalResponse = localResponse;
              }
              source = 'supabase';
              if (intent === 'contacto' || (typeof finalResponse === 'string' && (finalResponse.includes('wa.me') || finalResponse.includes('[BOTON_WHATSAPP]')))) {
                finalResponse = finalResponse.replace(/\[BOTON_WHATSAPP\]/g, '').trim();
                buttons = [
                  { label: '💬 Abrir WhatsApp Directo (+591 67750005)', isLink: true, url: 'https://wa.me/59167750005' }
                ];
              }
            } else {
            // 2. Si no hay respuesta local, intentar en Caché de IA
            onStatusUpdate("Revisando memoria caché...");
            const cachedResponse = await CacheService.getCachedResponse(userMessage);

            if (cachedResponse) {
              finalResponse = cachedResponse;
              source = 'cache';
              if (finalResponse.includes('wa.me') || finalResponse.includes('[BOTON_WHATSAPP]') || intent === 'contacto') {
                finalResponse = finalResponse.replace(/\[BOTON_WHATSAPP\]/g, '').trim();
                buttons = [
                  { label: '💬 Abrir WhatsApp Directo (+591 67750005)', isLink: true, url: 'https://wa.me/59167750005' }
                ];
              }
            } else {
              // 3. Si no hay caché, usar Gemini
              onStatusUpdate("Pensando (IA)...");
              const context = await SupabaseQueryService.getBusinessContext();
              const aiResponse = await GeminiService.getCompletion(userMessage, context);
              
              if (aiResponse === GEMINI_ERROR_MARKER) {
                finalResponse = "En este momento no puedo conectarme a mi motor de IA. Por favor verifica la configuración de Gemini o intenta más tarde.";
                source = 'error-gemini';
              } else {
                let finalAiResponse = aiResponse;
                
                if (finalAiResponse.includes('[BOTON_WHATSAPP]') || intent === 'contacto' || finalAiResponse.includes('wa.me')) {
                  finalAiResponse = finalAiResponse.replace(/\[BOTON_WHATSAPP\]/g, '').trim();
                  buttons = [
                    { label: '💬 Abrir WhatsApp Directo (+591 67750005)', isLink: true, url: 'https://wa.me/59167750005' }
                  ];
                }

                if (finalAiResponse.includes('[INICIAR_RESERVA]')) {
                  onStatusUpdate("Iniciando reserva...");
                  const result = ChatBotReservationService.start();
                  finalResponse = finalAiResponse.replace(/\[INICIAR_RESERVA\]/g, '').trim() + '\n\n' + result.text;
                  source = result.source;
                  buttons = result.buttons || buttons;
                  requestGPS = result.requestGPS || false;
                } else {
                  finalResponse = finalAiResponse;
                  source = 'gemini';
                  CacheService.saveToCache(userMessage, aiResponse).catch(e => console.error("Cache save error", e));
                }
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

    if (wasReservationCancelled) {
      finalResponse = "❌ Entendido, pausaremos la reserva por ahora.\n\n" + finalResponse;
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

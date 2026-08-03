import { IntentClassifier } from './IntentClassifier';
import { SupabaseQueryService } from './SupabaseQueryService';
import { CacheService } from './CacheService';
import { OpenAIService } from './OpenAIService';
import { supabase } from '../../supabase';


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
      const intent = IntentClassifier.classify(userMessage);

      // Detección especial de asignación de moto (Si manda ubicación)
      const isLocation = userMessage.toLowerCase().includes('ubicacion') || userMessage.toLowerCase().includes('ubicación') || userMessage.toLowerCase().includes('estoy en') || userMessage.toLowerCase().includes('avenida') || userMessage.toLowerCase().includes('calle') || userMessage.toLowerCase().includes('barrio');
      
      if (intent === 'reservar' && isLocation) {
        onStatusUpdate("Buscando moto disponible...");
        const { data: motos } = await supabase
          .from('trabajadores')
          .select('id, nombre')
          .eq('estado_disponibilidad', 'disponible')
          .limit(1);

        if (motos && motos.length > 0) {
          const motoAsignada = motos[0];
          // Asignar reserva
          await supabase.from('reservas').insert([{
            cliente_nombre: sessionId === 'web-session' ? 'Cliente Web' : sessionId,
            servicio: 'Lavado a Domicilio (Chatbot)',
            estado_reserva: 'asignado',
            trabajador_id: motoAsignada.id,
            ubicacion_gps: userMessage,
            chat_session_id: sessionId
          }]);
          
          finalResponse = `¡Perfecto! Lo atenderá **${motoAsignada.nombre}**. Él va en camino a tu ubicación y puede escribirte por este mismo chat. 🏍️💨`;
          source = 'supabase';
        } else {
          finalResponse = "En este momento todos nuestros lavadores están ocupados. Por favor intenta de nuevo en unos minutos. 🕒";
          source = 'supabase';
        }
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
          // 3. Si no hay caché, usar OpenAI
          onStatusUpdate("Pensando (IA)...");
          const aiResponse = await OpenAIService.getCompletion(userMessage);
          
          finalResponse = aiResponse;
          source = 'openai';

          // Guardar en caché para futuras consultas asíncronamente
          CacheService.saveToCache(userMessage, aiResponse).catch(e => console.error("Cache save error", e));
        }
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

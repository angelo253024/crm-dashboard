import { HybridAIService } from './HybridAIService';

/**
 * Adaptador preparado para WhatsApp Cloud API.
 * Sigue el patrón Adapter para desacoplar el canal (WhatsApp) de la lógica del Bot.
 * 
 * En el futuro, el Webhook de WhatsApp llamará a `receiveWebhook(req, res)`
 */
export class WhatsAppAdapter {
  
  /**
   * Procesa un webhook entrante desde Meta / WhatsApp
   */
  static async receiveWebhook(payload) {
    try {
      // 1. Extraer datos (pseudo-código de estructura de WhatsApp API)
      const entry = payload.entry?.[0];
      const changes = entry?.changes?.[0];
      const message = changes?.value?.messages?.[0];
      
      if (!message || message.type !== 'text') return { status: 'ignored' };

      const userMessage = message.text.body;
      const userPhone = message.from; // Usaremos el teléfono como Session ID

      // 2. Procesar con el Motor Híbrido Core
      // Pasamos un callback vacío para onStatusUpdate ya que en WA no podemos mostrar "Escribiendo..." tan granularmente
      const botResponse = await HybridAIService.processMessage(userMessage, `wa-${userPhone}`);

      // 3. Enviar respuesta de vuelta a WhatsApp
      await this.sendMessage(userPhone, botResponse.text);

      return { status: 'success' };
    } catch (error) {
      console.error("Error procesando Webhook de WhatsApp:", error);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Envía el mensaje de texto a través de WhatsApp Cloud API
   */
  static async sendMessage(to, text) {
    console.log(`[WhatsApp API Mock] Enviando a ${to}: ${text}`);
    // Aquí irá el fetch oficial a https://graph.facebook.com/v17.0/{PHONE_NUMBER_ID}/messages
  }
}

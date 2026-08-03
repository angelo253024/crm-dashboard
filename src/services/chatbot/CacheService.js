import { supabase } from '../../supabase';

/**
 * Servicio para verificar si una pregunta compleja ya fue resuelta antes por la IA.
 * Reduce llamadas innecesarias a OpenAI.
 */
export class CacheService {
  /**
   * Normaliza la cadena para evitar que diferencias de mayúsculas/espacios afecten el caché
   */
  static normalize(text) {
    return text.trim().toLowerCase().replace(/[.,!?;:¿¡]/g, '').replace(/\s+/g, ' ');
  }

  static async getCachedResponse(message) {
    const normalized = this.normalize(message);
    
    const { data, error } = await supabase
      .from('bot_cache')
      .select('respuesta, usos')
      .eq('pregunta_normalizada', normalized)
      .single();

    if (!error && data) {
      // Incrementar usos asincrónicamente
      supabase.from('bot_cache').update({ usos: data.usos + 1 }).eq('pregunta_normalizada', normalized).then();
      return data.respuesta;
    }

    return null;
  }

  static async saveToCache(message, response) {
    const normalized = this.normalize(message);
    await supabase.from('bot_cache').upsert([
      { pregunta_normalizada: normalized, respuesta: response, usos: 1 }
    ], { onConflict: 'pregunta_normalizada' });
  }
}

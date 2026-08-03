import { supabase } from '../../supabase';

/**
 * Servicio encargado de realizar consultas a la base de datos local
 * de Supabase para responder de forma gratuita y rápida.
 */
export class SupabaseQueryService {
  /**
   * Intenta encontrar una respuesta basada en la intención detectada.
   * @param {string} intent - La intención detectada por el clasificador.
   * @returns {string|null} - Retorna la respuesta si existe, o null si no se puede responder localmente.
   */
  static async getResponseForIntent(intent) {
    if (intent === 'UNKNOWN') return null;

    // 1. Intentar buscar en respuestas rápidas (FAQ) configurables
    const { data: faqData } = await supabase
      .from('bot_respuestas_rapidas')
      .select('respuesta')
      .eq('keyword', intent)
      .eq('activa', true)
      .single();

    if (faqData && faqData.respuesta) {
      return faqData.respuesta;
    }

    // 2. Si no hay respuesta rápida estática, intentar consultar las tablas de negocio dinámicas
    try {
      if (intent === 'precios' || intent === 'servicios') {
        const { data: servicios } = await supabase.from('servicios').select('nombre, precio');
        if (servicios && servicios.length > 0) {
          const listado = servicios.map(s => `- ${s.nombre}: Bs ${s.precio}`).join('\n');
          return `Nuestros servicios y precios son:\n${listado}`;
        }
      }

      if (intent === 'promociones') {
        const { data: promociones } = await supabase.from('promociones').select('*').eq('activa', true);
        if (promociones && promociones.length > 0) {
          const listado = promociones.map(p => {
            if (p.tipo === 'descuento') return `- ${p.titulo}: ${p.descuento_porcentaje}% de descuento.`;
            return `- ${p.titulo}: Combo a Bs ${p.precio_combo}.`;
          }).join('\n');
          return `Actualmente tenemos estas promociones activas:\n${listado}`;
        } else {
          return 'En este momento no tenemos promociones activas, pero mantente atento a nuestras redes.';
        }
      }

      // TODO: Implementar otras tablas dinámicas (inventario, estado_vehiculo) según necesidad.
    } catch (error) {
      console.error("Error consultando datos locales:", error);
    }

    return null;
  }
}

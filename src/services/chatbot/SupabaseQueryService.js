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
      // Precios y horarios son manejados ahora por Gemini para tener contexto inteligente del vehículo.
      if (intent === 'horario' || intent === 'precios' || intent === 'servicios') {
        return null;
      }

      if (intent === 'reservar') {
        return "Con gusto te ayudaremos a reservar tu servicio. **[RESERVAR_CITA]**";
      }

      if (intent === 'ubicacion') {
        return "📍 **Ubicación**\n\nActualmente operamos como servicio a domicilio en **Santa Cruz de la Sierra**. \n\nNo necesitas venir a nosotros, ¡nosotros vamos a ti con todo nuestro equipo móvil!";
      }

      if (intent === 'cobertura') {
        return "🚙 **Zonas de Cobertura**\n\nCubrimos **toda la zona urbana de Santa Cruz de la Sierra** (hasta el 8vo anillo).\n\nSi te encuentras fuera de esta zona, consúltanos para verificar la disponibilidad.";
      }

      if (intent === 'contacto') {
        return "📞 **Contacto**\n\nPuedes comunicarte con nosotros por los siguientes medios:\n\n• **WhatsApp**: +591 70000000\n• **Llamadas**: +591 70000000\n• **Correo**: contacto@lavamovil.com";
      }

      if (intent === 'metodos_pago') {
        const { data: config } = await supabase.from('configuraciones_pago').select('*').limit(1).single();
        let metodos = "• Efectivo\n";
        if (config && config.qr_image_url) {
          metodos += "• Transferencia QR\n";
        }
        return `💳 **Métodos de pago aceptados**\n\nActualmente aceptamos:\n\n${metodos}`;
      }

      if (intent === 'promociones') {
        const { data: promociones } = await supabase.from('promociones').select('*').eq('activa', true);
        if (promociones && promociones.length > 0) {
          const listado = promociones.map(p => {
            if (p.tipo === 'descuento') return `• **${p.titulo}**: ${p.descuento_porcentaje}% de descuento.`;
            return `• **${p.titulo}**: Combo a Bs ${p.precio_combo}.`;
          }).join('\n\n');
          return `⭐ **Promociones Activas**\n\n${listado}`;
        } else {
          return 'No tenemos promociones activas en este momento. ¡Mantente atento a nuestras redes sociales!';
        }
      }

      if (intent === 'faq_demora') {
        return "⏱️ **¿Cuánto demora el servicio?**\n\nEl tiempo aproximado varía según el tamaño del vehículo y el tipo de lavado, pero por lo general un lavado estándar toma **entre 45 minutos y 1 hora**.";
      }

      if (intent === 'faq_empresas') {
        return "🏢 **¿Trabajan con empresas?**\n\n¡Sí! Ofrecemos planes corporativos para flotas de vehículos con tarifas preferenciales. Selecciona la opción de **Contacto** para comunicarte con un asesor de ventas.";
      }

      // TODO: Implementar otras tablas dinámicas (inventario, estado_vehiculo) según necesidad.
    } catch (error) {
      console.error("Error consultando datos locales:", error);
    }

    return null;
  }

  static businessContextCache = null;
  static lastContextFetch = 0;

  /**
   * Obtiene el contexto del negocio (horarios, servicios, precios) para pasarlo a la IA
   */
  static async getBusinessContext() {
    const now = Date.now();
    if (this.businessContextCache && (now - this.lastContextFetch < 300000)) { // 5 minutos de caché
      return this.businessContextCache;
    }

    let context = "";
    try {
      // 0. Injectar Fecha y Hora Actual para contexto de reservas
      const fechaActual = new Date();
      const opcionesFecha = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/La_Paz' };
      const fechaStr = fechaActual.toLocaleDateString('es-ES', opcionesFecha);
      const horaStr = fechaActual.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz' });
      
      context += `FECHA Y HORA ACTUAL: Hoy es ${fechaStr}, hora actual: ${horaStr}.\n\n`;

      // 1. Cargar Horarios
      const { data: horarios } = await supabase.from('horarios_atencion').select('*').order('orden', { ascending: true });
      if (horarios && horarios.length > 0) {
        context += "HORARIOS DE ATENCIÓN:\n";
        horarios.forEach(h => {
          if (h.cerrado) {
            context += `- ${h.dia_semana}: Cerrado\n`;
          } else {
            const apertura = h.hora_apertura ? h.hora_apertura.substring(0, 5) : '08:00';
            const cierre = h.hora_cierre ? h.hora_cierre.substring(0, 5) : '19:00';
            context += `- ${h.dia_semana}: ${apertura} a ${cierre}\n`;
          }
        });
        context += "\n";
      }

      // 2. Cargar Servicios
      const { data: servicios } = await supabase.from('servicios').select('nombre, precio, categoria').eq('disponible', true);
      if (servicios && servicios.length > 0) {
        context += "SERVICIOS Y PRECIOS:\n(Las terminaciones P, M, L, XL indican el tamaño del vehículo. P=Pequeño, M=Mediano, L=Grande, XL=Extra Grande)\n";
        servicios.forEach(s => {
          context += `- ${s.nombre} (Categoría: ${s.categoria}): Bs. ${s.precio}\n`;
        });
        context += "\n";
      }

      this.businessContextCache = context;
      this.lastContextFetch = now;
    } catch (error) {
      console.error("Error consultando contexto de negocio:", error);
    }

    return this.businessContextCache || "";
  }
}

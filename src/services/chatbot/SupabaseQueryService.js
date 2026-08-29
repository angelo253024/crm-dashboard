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

      if (intent === 'saludo') {
        return "¡Hola! 👋 ¡Qué gusto saludarte! Bienvenido a **Lavamóvil Norte** ✨🚗\n\nSomos tu servicio premium de lavado y detallado automotriz a domicilio en Santa Cruz de la Sierra.\n\nVamos hasta la comodidad de tu hogar u oficina. Solo necesitamos un grifo de agua y un enchufe disponible, ¡y nosotros nos encargamos de dejar tu vehículo como nuevo!\n\n¿En qué podemos consentir a tu vehículo hoy?";
      }

      if (intent === 'requisitos' || intent === 'autonomia') {
        return "💧 **¿Cómo funciona nuestro servicio a domicilio?**\n\nVamos directamente hasta tu casa, condominio u oficina con todo nuestro equipamiento profesional.\n\n**Solo necesitamos de tu parte:**\n• **1 toma de agua (grifo o canilla)** 🚰\n• **1 toma de corriente o enchufe disponible** 🔌\n\nNosotros llevamos extensiones largas, mangueras, hidrolavadoras de alta presión, aspiradoras industriales y todos los insumos de alta gama. ¡Tú solo relájate mientras dejamos tu vehículo impecable!";
      }

      if (intent === 'insumos') {
        return "✨ **Insumos y Cuidado de tu Vehículo**\n\nUtilizamos exclusivamente productos automotrices de grado profesional:\n\n• **Shampoo con pH neutro** y cera biodegradable que no desgasta la pintura.\n• **Microfibras ultra suaves** de alto gramaje para evitar microrayones (swirls).\n• **Cera protectora de alta duración** para un brillo profundo efecto espejo.\n• **Hidratantes sin silicona grasosa** para tableros y neumáticos.";
      }

      if (intent === 'tapiceria') {
        return "🧼 **Limpieza Profunda de Tapicería**\n\nRealizamos lavado detallado de asientos, alfombras y techo utilizando sistema de inyección-extracción a vapor. Eliminamos suciedad profunda, manchas y malos olores dejando tus interiores frescos y desinfectados. ¿Te gustaría agendar una cita?";
      }

      if (intent === 'motor') {
        return "⚙️ **Limpieza Detallada de Motor**\n\nRealizamos limpieza y detallado de vano motor con técnica en seco/vapor controlado y productos dieléctricos que protegen componentes electrónicos y dejan las mangueras y plásticos hidratados y protegidos.";
      }

      if (intent === 'reservar') {
        return "¡Excelente! Con gusto agendaremos tu cita para dejar tu vehículo impecable. **[RESERVAR_CITA]**";
      }

      if (intent === 'ubicacion') {
        return "📍 **Servicio 100% a Domicilio**\n\nOperamos en toda la ciudad de **Santa Cruz de la Sierra**.\n\nNo necesitas moverte ni perder tiempo en filas: ¡vamos hasta tu casa, condominio u oficina!";
      }

      if (intent === 'cobertura') {
        return "🚙 **Zonas de Cobertura**\n\nCubrimos **toda la zona urbana de Santa Cruz de la Sierra** (desde el centro hasta el 8vo anillo, zonas residenciales y condominios).\n\nSi te encuentras un poco más lejos, ¡consúltanos y coordinamos la disponibilidad!";
      }

      if (intent === 'contacto') {
        return "📞 **Canales de Atención**\n\nEstamos siempre a tu disposición:\n\n• **WhatsApp directo**: [+591 67750005](https://wa.me/59167750005)\n• **Llamadas**: +591 67750005\n• **Horario**: Lunes a Domingo de 08:00 a 19:00\n\n¿En qué podemos colaborarte hoy?";
      }

      if (intent === 'metodos_pago') {
        const { data: config } = await supabase.from('configuraciones_pago').select('*').limit(1).single();
        let metodos = "• **Transferencia bancaria o QR simple** 📲\n• **Efectivo al culminar el servicio** 💵\n";
        return `💳 **Métodos de Pago Cómodos y Seguros**\n\nAceptamos:\n\n${metodos}\n_Pagas únicamente al finalizar el servicio tras revisar que todo haya quedado impecable._`;
      }

      if (intent === 'promociones') {
        const { data: promociones } = await supabase.from('promociones').select('*').eq('activa', true);
        if (promociones && promociones.length > 0) {
          const listado = promociones.map(p => {
            if (p.tipo === 'descuento') return `• ⭐ **${p.titulo}**: ${p.descuento_porcentaje}% de descuento especial.`;
            return `• ⭐ **${p.titulo}**: Paquete especial a Bs ${p.precio_combo}.`;
          }).join('\n\n');
          return `🎉 **Promociones Activas para Ti**\n\n${listado}\n\n¿Te gustaría aprovechar alguna de estas promociones hoy?`;
        } else {
          return '✨ Actualmente tenemos nuestras tarifas promocionales habituales en Lavados Premium y Clásicos. Si gustas indícame tu vehículo y te paso los precios exactos.';
        }
      }

      if (intent === 'faq_demora') {
        return "⏱️ **¿Cuánto demora el servicio?**\n\n• **Lavado Clásico**: 40 a 50 minutos aprox.\n• **Lavado Premium**: 1 hora a 1 hora y 15 minutos aprox.\n• **Limpieza profunda de Tapicería / Detallado**: 1.5 a 2 horas.\n\nTodo con la máxima minuciosidad y cuidado.";
      }

      if (intent === 'faq_empresas') {
        return "🏢 **Atención Corporativa y Flotas**\n\n¡Sí! Brindamos convenios especiales y tarifas preferenciales para empresas, flotas corporativas y condominios. Contáctanos por WhatsApp para enviarte una propuesta personalizada.";
      }

      // TODO: Implementar otras tablas dinámicas según necesidad.
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
      
      context += `FECHA Y HORA ACTUAL: Hoy es ${fechaStr}, hora actual en Santa Cruz: ${horaStr}.\n\n`;

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
      const { data: servicios } = await supabase.from('servicios').select('nombre, precio, categoria, disponible').eq('disponible', true);
      if (servicios && servicios.length > 0) {
        context += "SERVICIOS Y PRECIOS ACTIVOS EN SISTEMA:\n(Guía de tamaños: P=Pequeño, M=Mediano, L=Grande, XL=Extra Grande/Camioneta/3 Filas, MOTO=Motocicletas)\n";
        servicios.forEach(s => {
          context += `- ${s.nombre} [Cat: ${s.categoria}]: Bs. ${s.precio}\n`;
        });
        context += "\n";
      }

      // 3. Cargar Promociones
      const { data: promociones } = await supabase.from('promociones').select('*').eq('activa', true);
      if (promociones && promociones.length > 0) {
        context += "PROMOCIONES VIGENTES:\n";
        promociones.forEach(p => {
          if (p.tipo === 'descuento') {
            context += `- ${p.titulo}: ${p.descuento_porcentaje}% de descuento.\n`;
          } else {
            context += `- ${p.titulo}: Combo a Bs. ${p.precio_combo}.\n`;
          }
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

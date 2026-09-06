import { supabase } from '../../supabase';

/**
 * Analiza el texto ingresado por el usuario y determina la intención (keyword)
 * buscando coincidencias en los sinónimos configurados en la base de datos.
 */
export class IntentClassifier {
  static cachedRules = null;
  static lastFetch = 0;

  // Fallback estático de intenciones para garantizar funcionamiento 100% offline o sin DB configurada
  static staticRules = [
    { intent: 'saludo', keywords: ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'buen dia', 'que tal', 'hola buenas', 'hola que tal'] },
    { intent: 'requisitos', keywords: ['que necesitan', 'llevan agua', 'traen agua', 'necesitan agua', 'necesitan luz', 'generador', 'enchufe', 'toma de agua', 'grifo', 'canilla', 'corriente', 'que se necesita', 'como funciona', 'requisitos', 'autonomos'] },
    { intent: 'insumos', keywords: ['que productos usan', 'shampoo', 'cera', 'biodegradable', 'quimicos', 'dañan la pintura', 'rayar', 'productos'] },
    { intent: 'tapiceria', keywords: ['lavado de asientos', 'tapiz', 'tapiceria', 'asientos sucios', 'manchas en asientos', 'lavar asientos', 'limpieza de tapiz'] },
    { intent: 'motor', keywords: ['lavan motor', 'lavado de motor', 'limpieza de motor', 'lavar motor'] },
    { intent: 'precios', keywords: ['precio', 'precios', 'cuanto cuesta', 'valor', 'costo', 'costos', 'servicios', 'lavado premium', 'lavado exterior'] },
    { intent: 'reservar', keywords: ['reservar', 'reserva', 'cita', 'agenda', 'agendar', 'quiero agendar', 'quiero reservar'] },
    { intent: 'disponibilidad', keywords: ['espacio', 'tienen espacio', 'hay espacio', 'espacio para un lavado', 'espacio para hoy', 'espacio hoy', 'espacio en la tarde', 'tienen lugar', 'hay lugar', 'cupo', 'cupos', 'disponibilidad', 'disponible hoy', 'tienen libre'] },
    { intent: 'ubicacion', keywords: ['ubicación', 'ubicacion', 'dirección', 'direccion', 'dónde están', 'donde estan', 'mapa', 'donde atienden'] },
    { intent: 'horario', keywords: ['horario', 'horarios', 'a que hora', 'dias', 'domingo', 'feriado', 'abierto'] },
    { intent: 'contacto', keywords: ['contacto', 'teléfono', 'telefono', 'whatsapp', 'correo', 'llamar', 'numero', 'asesor'] },
    { intent: 'cobertura', keywords: ['cobertura', 'zonas', 'llegan a', 'domicilio', 'anillo', 'condominio', 'donde van'] },
    { intent: 'metodos_pago', keywords: ['pago', 'pagar', 'métodos', 'metodos', 'qr', 'efectivo', 'tarjeta', 'transferencia', 'cobran'] },
    { intent: 'promociones', keywords: ['promoción', 'promocion', 'promociones', 'promo', 'descuento', 'oferta', 'descuentos'] },
    { intent: 'faq_demora', keywords: ['cuanto demora', 'cuánto demora', 'tiempo', 'cuanto tardan', 'duracion'] },
    { intent: 'faq_empresas', keywords: ['empresas', 'flota', 'corporativo', 'empresa', 'flotas', 'convenio'] }
  ];

  static async loadRules() {
    const now = Date.now();
    // Cache rules for 5 minutes
    if (this.cachedRules && (now - this.lastFetch < 300000)) {
      return this.cachedRules;
    }

    try {
      const { data } = await supabase.from('bot_respuestas_rapidas').select('keyword, sinonimos').eq('activa', true);
      if (data) {
        this.cachedRules = data.map(item => ({
          intent: item.keyword,
          keywords: item.sinonimos ? item.sinonimos.split(',').map(s => s.trim().toLowerCase()) : [item.keyword]
        }));
        this.lastFetch = now;
      }
    } catch (e) {
      console.error("Error loading intent rules:", e);
    }
    
    return this.cachedRules || [];
  }

  static async classify(message) {
    const text = message.toLowerCase();
    
    const dbRules = await this.loadRules();
    
    // Unificar reglas dinámicas y estáticas (dando prioridad a las de DB)
    const allRules = [...dbRules, ...this.staticRules];

    // Remove accents for better matching
    const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const normalizedText = normalize(message);

    // Check exact matches or phrase inclusions
    for (const rule of allRules) {
      if (rule.keywords.some(keyword => {
        if (!keyword) return false;
        const normalizedKeyword = normalize(keyword);
        return normalizedText.includes(normalizedKeyword);
      })) {
        return rule.intent;
      }
    }

    // Si no coincide con nada configurado, asume que es una pregunta compleja que requiere IA
    return 'UNKNOWN';
  }
}

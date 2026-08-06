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
    { intent: 'precios', keywords: ['precio', 'precios', 'cuanto cuesta', 'valor', 'costo', 'costos', 'servicios', 'lavado premium', 'lavado exterior'] },
    { intent: 'reservar', keywords: ['reservar', 'reserva', 'cita', 'agenda', 'agendar'] },
    { intent: 'ubicacion', keywords: ['ubicación', 'ubicacion', 'dirección', 'direccion', 'dónde están', 'donde estan', 'mapa'] },
    { intent: 'horario', keywords: ['horario', 'horarios', 'a que hora', 'dias', 'domingo', 'feriado'] },
    { intent: 'contacto', keywords: ['contacto', 'teléfono', 'telefono', 'whatsapp', 'correo', 'llamar'] },
    { intent: 'cobertura', keywords: ['cobertura', 'zonas', 'llegan a', 'domicilio'] },
    { intent: 'metodos_pago', keywords: ['pago', 'pagar', 'métodos', 'metodos', 'qr', 'efectivo', 'tarjeta', 'transferencia'] },
    { intent: 'promociones', keywords: ['promoción', 'promocion', 'promociones', 'promo', 'descuento', 'oferta'] },
    { intent: 'faq_demora', keywords: ['cuanto demora', 'cuánto demora', 'tiempo'] },
    { intent: 'faq_empresas', keywords: ['empresas', 'flota', 'corporativo'] }
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

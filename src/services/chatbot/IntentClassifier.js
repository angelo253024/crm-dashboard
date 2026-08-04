import { supabase } from '../../supabase';

/**
 * Analiza el texto ingresado por el usuario y determina la intención (keyword)
 * buscando coincidencias en los sinónimos configurados en la base de datos.
 */
export class IntentClassifier {
  static cachedRules = null;
  static lastFetch = 0;

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
    
    const rules = await this.loadRules();

    // Check exact matches or phrase inclusions
    for (const rule of rules) {
      if (rule.keywords.some(keyword => {
        if (!keyword) return false;
        // Basic inclusion check. Can be enhanced with regex boundaries if needed.
        return text.includes(keyword);
      })) {
        return rule.intent;
      }
    }

    // Si no coincide con nada configurado, asume que es una pregunta compleja que requiere IA
    return 'UNKNOWN';
  }
}

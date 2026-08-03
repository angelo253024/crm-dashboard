/**
 * Analiza el texto ingresado por el usuario y determina la intención (keyword)
 * para intentar buscar una respuesta en caché o base de datos local (respuestas rápidas)
 * antes de invocar a OpenAI.
 */
export class IntentClassifier {
  static classify(message) {
    const text = message.toLowerCase();
    
    // Reglas de negocio predefinidas
    const rules = [
      { intent: 'horario', keywords: ['horario', 'hora', 'abren', 'cierran', 'atención', 'abierto'] },
      { intent: 'ubicacion', keywords: ['ubicación', 'ubicacion', 'dónde', 'donde', 'dirección', 'direccion', 'llego', 'mapa'] },
      { intent: 'precios', keywords: ['precio', 'cuesta', 'cuanto', 'cuánto', 'valor', 'tarifas', 'cobran'] },
      { intent: 'promociones', keywords: ['promoción', 'promocion', 'promociones', 'descuento', 'descuentos', 'oferta', 'ofertas', 'combo'] },
      { intent: 'servicios', keywords: ['servicios', 'lavado', 'aspirado', 'motor', 'chasis', 'limpieza', 'ofrecen'] },
      { intent: 'metodos_pago', keywords: ['pago', 'pagar', 'efectivo', 'tarjeta', 'qr', 'transferencia'] },
      { intent: 'reservas', keywords: ['reserva', 'reservar', 'cita', 'agendar', 'agenda', 'turno'] },
      { intent: 'estado_vehiculo', keywords: ['estado', 'vehículo', 'auto', 'terminó', 'termino', 'listo', 'falta'] }
    ];

    // Buscar coincidencia simple
    for (const rule of rules) {
      if (rule.keywords.some(keyword => text.includes(keyword))) {
        return rule.intent;
      }
    }

    // Si no coincide con nada básico, asume que es una pregunta compleja que requiere IA
    return 'UNKNOWN';
  }
}

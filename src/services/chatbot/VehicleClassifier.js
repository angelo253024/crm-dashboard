import { GeminiService } from './GeminiService.js';

/**
 * VehicleClassifier
 * Sistema híbrido (IA Gemini + Base de Conocimientos Determinista)
 * para clasificar vehículos por tamaño físico real y tamaño de servicio (P, M, L, XL, MOTO).
 */

const VEHICLE_KNOWLEDGE_BASE = [
  // MOTOS
  { keywords: ['moto', 'motocicleta', 'pasola', 'scooter', 'bici', 'bicicleta', 'navi', 'gixxer', 'pulsar', 'vespa', 'ktm', 'ninja'], size: 'MOTO', tipo: 'Motocicleta' },

  // XL: Pickups grandes y medianas, SUVs grandes de 3 filas, Vans grandes
  { keywords: ['tundra', 'hilux', 'ranger', 'silverado', 'f150', 'f-150', 'f250', 'f-250', 'ram 1500', 'ram 2500', 'tacoma', 'frontier', 'l200', 'amarok', 'colorado', 's10 doble cabina', 'titan'], size: 'XL', tipo: 'Camioneta Pickup' },
  { keywords: ['land cruiser', 'prado', 'sequoia', 'tahoe', 'suburban', 'expedition', 'escalade', 'yukon', 'armada', 'patrol', 'navigator', 'gls', 'x7', 'q8', 'palisade', 'telluride', 'carnival', 'staria', 'h1', 'h-1', 'hiace', 'sprinter', 'vito', 'transporter', 'urvan'], size: 'XL', tipo: 'SUV Grande / Van' },
  { keywords: ['highlander', 'traverse', 'durango', 'commander', 'explorer 3', 'pilot 3', 'fortuner 3'], size: 'XL', tipo: 'SUV de 3 Filas' },

  // L: SUVs medianas (2 filas), Sedanes grandes, Pickups cabina sencilla
  { keywords: ['rav4', 'rav 4', 'cr-v', 'crv', 'x-trail', 'xtrail', 'tucson', 'sportage', 'cx-5', 'cx5', 'cx-50', 'forester', 'outback', 'crosstrek', 'qashqai', 'taos', 'tiguan', 'equinox', 'captiva', 'edge', 'escape', 'sorento', 'santa fe', 'grand vitara', 'nomade', 'xl7', 'outlander', 'asx', 'cherokee', 'compass', 'wrangler', 'glc', 'gle', 'x3', 'x4', 'x5', 'q3', 'q5', 'haval h6'], size: 'L', tipo: 'SUV Mediana' },
  { keywords: ['camry', 'accord', 'altima', 'passat', 'fusion', 'mazda 6', 'sonata', 'optima', 'k5', 'serie 5', 'serie 7', 'clase e', 'clase s', 'a6', 'a8'], size: 'L', tipo: 'Sedán Grande' },

  // M: Sedanes medianos, Hatchbacks medianos, SUVs pequeñas / Crossovers
  { keywords: ['corolla', 'civic', 'sentra', 'versa', 'jetta', 'virtus', 'mazda 3', 'elantra', 'cerato', 'forte', 'onix sedan', 'cruze', 'logan', 'impreza', 'lancer', 'serie 3', 'clase c', 'a4'], size: 'M', tipo: 'Sedán Mediano' },
  { keywords: ['swift', 'baleno', 'fit', 'note', 'polo', 'sandero', 'mazda 2', '208', '308', 'rio', 'i20', 'golf', 'serie 1', 'serie 2', 'clase a', 'a3'], size: 'M', tipo: 'Hatchback Mediano' },
  { keywords: ['tracker', 'kicks', 'creta', 'sonet', 'seltos', 'hr-v', 'hrv', 't-cross', 'tcross', 'nivus', 'ecosport', 'duster', 'captur', '2008', 'cx-3', 'cx30', 'gla', 'x1', 'x2', 'jimny', 'vitara 2p', 'raize', 'corolla cross', 'urban cruiser'], size: 'M', tipo: 'SUV Pequeña / Crossover' },

  // P: Compactos pequeños, Urbanos, Hatchbacks pequeños
  { keywords: ['alto', 'celerio', 'ignis', 'maruti', 'yaris', 'starlet', 'vitz', 'passo', 'aygo', 'i10', 'grand i10', 'atos', 'eon', 'picanto', 'ray', 'spark', 'beat', 'chevy', 'celta', 'march', 'up!', 'gol', 'fox', 'kwid', 'twingo', 'clio', 'uno', 'mobi', 'palio', '500', 'ka', 'fiesta'], size: 'P', tipo: 'Compacto Pequeño' }
];

export class VehicleClassifier {

  /**
   * Clasifica un vehículo combinando IA Gemini con reglas deterministas
   * @param {string} vehicleInput - Texto con marca y modelo ingresado por el usuario
   * @returns {Promise<Object>} Object con { marca, modelo, tipo, tamanoFisico, tamanoServicio, confianza }
   */
  static async classify(vehicleInput) {
    if (!vehicleInput || typeof vehicleInput !== 'string') {
      return { marca: '', modelo: '', tipo: 'Vehículo', tamanoFisico: 'Mediano', tamanoServicio: 'M', confianza: 0 };
    }

    const cleanInput = vehicleInput.trim();
    const lowerInput = cleanInput.toLowerCase();

    // 1. Detección rápida de Motos
    if (['moto', 'motocicleta', 'pasola', 'scooter', 'bici', 'bicicleta'].some(k => lowerInput.includes(k))) {
      return {
        marca: 'Moto / Bici',
        modelo: cleanInput,
        tipo: 'Motocicleta',
        tamanoFisico: 'Moto',
        tamanoServicio: 'MOTO',
        confianza: 100
      };
    }

    // 2. Comprobar si el texto es ambiguo o genérico (ej: "una camioneta", "mi auto")
    const isGenericAmbiguous = ['camioneta', 'auto', 'carro', 'coche', 'suv', 'vehiculo', 'camion'].includes(lowerInput.trim());
    if (isGenericAmbiguous) {
      return {
        marca: '',
        modelo: cleanInput,
        tipo: 'Genérico Indefinido',
        tamanoFisico: 'Indefinido',
        tamanoServicio: 'M',
        confianza: 50
      };
    }

    // 3. Consulta a Gemini IA para clasificación analítica
    try {
      const prompt = `Analiza este vehículo especificado por un cliente: "${cleanInput}".
Clasifícalo según sus dimensiones físicas reales en una de estas categorías de servicio exactas:
- "P": Autos compactos pequeños, hatchbacks pequeños, urbanos (ej. Suzuki Alto, Toyota Yaris, Hyundai i10, Kia Picanto, Spark, Kwid, Gol).
- "M": Sedanes medianos/compactos, hatchbacks medianos, crossovers pequeños, SUVs pequeñas (ej. Toyota Corolla, Honda Civic, Nissan Versa, Suzuki Swift, Creta, Kicks, Tracker, Ecosport, Jimny).
- "L": Sedanes grandes, SUVs medianas (2 filas), crossovers grandes, pickups pequeñas cabina sencilla (ej. Toyota RAV4, CR-V, Tucson, Sportage, X-Trail, Toyota Camry, BMW Serie 7, CX-5).
- "XL": SUVs grandes (3 filas/full size), pickups medianas y grandes, vans grandes, minibuses (ej. Toyota Tundra, Hilux, Ford Ranger, Land Cruiser, Prado, F-150, Tacoma, Fortuner, Silverado, HiAce, Explorer, Durango).
- "MOTO": Motocicletas y bicicletas.

REGLAS DE EVALUACIÓN:
1. No uses "lujo" ni "marca" para decidir el tamaño, sólo las dimensiones físicas reales.
2. Si el cliente escribe algo ambiguo o genérico como "un auto", "una camioneta", "mi coche" sin especificar la marca o modelo exacto, asigna "confianza": 50.
3. Si especificó marca y modelo claros, asigna "confianza": 95 o superior.

Devuelve ÚNICAMENTE un objeto JSON válido con este formato exacto, sin markdown ni comillas triples:
{"marca": "Marca", "modelo": "Modelo", "tipo": "Tipo de vehículo (ej: Pickup grande, Sedán mediano)", "tamanoFisico": "Pequeño/Mediano/Grande/3 Filas", "tamanoServicio": "P" o "M" o "L" o "XL" o "MOTO", "confianza": 95}`;

      const aiText = await GeminiService.getCompletion(prompt);
      if (aiText && aiText !== '__GEMINI_ERROR__') {
        const cleaned = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        if (parsed && parsed.tamanoServicio && ['P', 'M', 'L', 'XL', 'MOTO'].includes(parsed.tamanoServicio)) {
          return {
            marca: parsed.marca || '',
            modelo: parsed.modelo || cleanInput,
            tipo: parsed.tipo || 'Vehículo',
            tamanoFisico: parsed.tamanoFisico || 'Mediano',
            tamanoServicio: parsed.tamanoServicio,
            confianza: typeof parsed.confianza === 'number' ? parsed.confianza : 95
          };
        }
      }
    } catch (e) {
      console.warn("Gemini no pudo clasificar el vehículo, usando motor determinista local...", e);
    }

    // 4. Fallback determinista local (Base de Conocimientos)
    return this.classifyLocal(cleanInput);
  }

  /**
   * Clasificación determinista local basada en base de conocimiento de modelos conocidos
   */
  static classifyLocal(input) {
    const lower = input.toLowerCase();

    for (const item of VEHICLE_KNOWLEDGE_BASE) {
      for (const kw of item.keywords) {
        if (lower.includes(kw)) {
          const words = input.split(' ');
          const marca = words.length > 1 ? words[0] : '';
          const modelo = words.length > 1 ? words.slice(1).join(' ') : input;

          return {
            marca: marca,
            modelo: modelo,
            tipo: item.tipo,
            tamanoFisico: item.size === 'XL' ? 'Grande' : (item.size === 'L' ? 'Mediano-Grande' : (item.size === 'M' ? 'Mediano' : 'Pequeño')),
            tamanoServicio: item.size,
            confianza: 90
          };
        }
      }
    }

    return {
      marca: '',
      modelo: input,
      tipo: 'Vehículo Mediano',
      tamanoFisico: 'Mediano',
      tamanoServicio: 'M',
      confianza: 75
    };
  }
}

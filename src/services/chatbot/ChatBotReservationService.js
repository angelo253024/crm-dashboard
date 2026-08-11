import { supabase } from '../../supabase';
import { GeminiService } from './GeminiService';
import { geofencingService } from '../geofencing/GeofencingService';

/**
 * ChatBotReservationService — Máquina de estados para reservas guiadas desde el chatbot.
 * Recolecta los mismos datos que ServiciosCatalog.jsx y crea la reserva en Supabase.
 * 
 * Estados: IDLE → ASKING_NAME → ASKING_PHONE → ASKING_VEHICLE → ASKING_SERVICE
 *        → ASKING_LOCATION → ASKING_DATE → ASKING_TIME → CONFIRMING → DONE
 */

// Estado global de la reserva en curso (una por sesión de chat)
let _reservationState = null;

const STEPS = {
  IDLE: 'IDLE',
  ASKING_NAME: 'ASKING_NAME',
  ASKING_PHONE: 'ASKING_PHONE',
  ASKING_VEHICLE: 'ASKING_VEHICLE',
  ASKING_VEHICLE_CATEGORY: 'ASKING_VEHICLE_CATEGORY',
  ASKING_PACKAGE: 'ASKING_PACKAGE',
  ASKING_SERVICE: 'ASKING_SERVICE',
  ASKING_LOCATION: 'ASKING_LOCATION',
  ASKING_DATE: 'ASKING_DATE',
  ASKING_TIME: 'ASKING_TIME',
  CONFIRMING: 'CONFIRMING',
  DONE: 'DONE',
};

export class ChatBotReservationService {

  /**
   * Verifica si hay una reserva en progreso
   */
  static isActive() {
    return _reservationState !== null && _reservationState.step !== STEPS.IDLE && _reservationState.step !== STEPS.DONE;
  }

  /**
   * Inicia un nuevo flujo de reserva
   */
  static start() {
    _reservationState = {
      step: STEPS.ASKING_NAME,
      data: {
        clienteNombre: '',
        clienteTelefono: '',
        vehiculo: '',
        paqueteSeleccionado: '',
        servicioId: null,
        servicioNombre: '',
        servicioPrecio: 0,
        ubicacion: '',
        fechaReserva: '',
        horaReserva: '',
      }
    };

    return {
      text: '¡Perfecto! Vamos a agendar tu cita de lavado. 📅\n\n¿Cuál es tu **nombre completo**?',
      source: 'reservation',
      buttons: null,
      requestGPS: false,
    };
  }

  /**
   * Cancela la reserva en curso
   */
  static cancel() {
    _reservationState = null;
    return {
      text: '❌ Reserva cancelada. Si necesitas algo más, ¡estoy aquí!',
      source: 'reservation',
      buttons: null,
      requestGPS: false,
    };
  }

  /**
   * Procesa el input del usuario según el paso actual de la reserva
   */
  static async processStep(userInput) {
    if (!_reservationState) return null;

    const input = userInput.trim();

    // Cancelar en cualquier momento
    if (['cancelar', 'salir', 'no', 'cancelar reserva'].includes(input.toLowerCase())) {
      return this.cancel();
    }

    switch (_reservationState.step) {

      case STEPS.ASKING_NAME:
        if (input.length < 2) {
          return { text: 'Por favor, ingresa un nombre válido (mínimo 2 caracteres).', source: 'reservation', buttons: null, requestGPS: false };
        }
        _reservationState.data.clienteNombre = input;
        _reservationState.step = STEPS.ASKING_PHONE;
        return {
          text: `Gracias, **${input}** 👋\n\n¿Cuál es tu número de **WhatsApp**?`,
          source: 'reservation',
          buttons: null,
          requestGPS: false,
        };

      case STEPS.ASKING_PHONE:
        const cleanPhone = input.replace(/\D/g, '');
        if (cleanPhone.length < 7) {
          return { text: 'Por favor, ingresa un número de teléfono válido (mínimo 7 dígitos).', source: 'reservation', buttons: null, requestGPS: false };
        }
        _reservationState.data.clienteTelefono = input;
        _reservationState.step = STEPS.ASKING_VEHICLE;
        return {
          text: '🚗 ¿Cuál es la **marca y modelo** de tu vehículo?\n\n_Ejemplo: Toyota Corolla, Suzuki Alto, Ford Explorer_',
          source: 'reservation',
          buttons: null,
          requestGPS: false,
        };

      case STEPS.ASKING_VEHICLE:
        if (input.length < 2) {
          return { text: 'Por favor, escribe la marca y modelo de tu vehículo.', source: 'reservation', buttons: null, requestGPS: false };
        }
        
        // Llamada a Gemini
        const prompt = `Analiza este mensaje de un cliente que indica su vehículo: "${input}". 
Identifica la Marca, Modelo y Categoría del vehículo (ej. Pequeño, SUV, Camioneta, Van, Sedán Mediano, etc).
La respuesta DEBE ser ÚNICAMENTE un objeto JSON válido, sin markdown, sin backticks y sin texto adicional.
Ejemplo de salida correcta:
{"marca": "Toyota", "modelo": "Corolla", "categoria": "Sedán Mediano"}
Si el mensaje no parece un vehículo válido o no puedes identificarlo, responde exactamente:
{"error": true}`;

        let aiResponse = "";
        let parsed = null;
        try {
          aiResponse = await GeminiService.getCompletion(prompt);
          aiResponse = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
          parsed = JSON.parse(aiResponse);
        } catch(e) {
          console.error("Error parsing Gemini vehicle response", e);
        }

        if (parsed && !parsed.error && parsed.marca && parsed.modelo) {
          // Éxito con Gemini
          const vehiculoIdentificado = `${parsed.marca} ${parsed.modelo} (${parsed.categoria || 'Vehículo'})`;
          _reservationState.data.vehiculo = vehiculoIdentificado;
          _reservationState.step = STEPS.ASKING_PACKAGE;
          
          return {
            text: `Detecté que tu vehículo es un ${vehiculoIdentificado}.\n\nSelecciona el tipo de paquete que deseas:`,
            source: 'reservation',
            buttons: [
              { label: '🟦 Lavado Clásico', value: 'CLASICO' },
              { label: '⭐ Lavado Premium (Recomendado)', value: 'PREMIUM' }
            ],
            requestGPS: false,
          };
        } else {
          // Fallo de Gemini
          _reservationState.data.vehiculo = input;
          _reservationState.step = STEPS.ASKING_VEHICLE_CATEGORY;
          
          return {
            text: 'No pude identificar el tipo de vehículo.\n\nSelecciona una categoría:',
            source: 'reservation',
            buttons: [
              { label: '🚗 Pequeño', value: 'Pequeño' },
              { label: '🚙 SUV', value: 'SUV' },
              { label: '🛻 Camioneta', value: 'Camioneta' },
              { label: '🚐 Van', value: 'Van' }
            ],
            requestGPS: false,
          };
        }

      case STEPS.ASKING_VEHICLE_CATEGORY:
        // El usuario seleccionó o escribió una categoría
        const categoria = ['Pequeño', 'SUV', 'Camioneta', 'Van'].find(c => input.toLowerCase().includes(c.toLowerCase())) || input;
        _reservationState.data.vehiculo = `${_reservationState.data.vehiculo} - ${categoria}`;
        _reservationState.step = STEPS.ASKING_PACKAGE;
        
        return {
          text: '¡Perfecto! Selecciona el tipo de paquete que deseas:',
          source: 'reservation',
          buttons: [
            { label: '🟦 Lavado Clásico', value: 'CLASICO' },
            { label: '⭐ Lavado Premium (Recomendado)', value: 'PREMIUM' }
          ],
          requestGPS: false,
        };

      case STEPS.ASKING_PACKAGE:
        let paquete = '';
        if (input === 'CLASICO' || input.toLowerCase().includes('clásico') || input.toLowerCase().includes('clasico')) {
          paquete = 'Clásico';
        } else if (input === 'PREMIUM' || input.toLowerCase().includes('premium')) {
          paquete = 'Premium';
        } else {
          return { 
            text: 'Por favor, selecciona una opción válida.', 
            source: 'reservation', 
            buttons: [
              { label: '🟦 Lavado Clásico', value: 'CLASICO' }, 
              { label: '⭐ Lavado Premium', value: 'PREMIUM' }
            ], 
            requestGPS: false 
          };
        }

        _reservationState.data.paqueteSeleccionado = paquete;
        _reservationState.step = STEPS.ASKING_SERVICE;

        // Obtener servicios y filtrar por el paquete
        const servicios = await this._getServicios();
        if (servicios.length === 0) {
          return {
            text: '⚠️ No hay servicios configurados en este momento. Contacta al administrador.',
            source: 'reservation',
            buttons: null,
            requestGPS: false,
          };
        }

        const serviciosFiltrados = servicios.filter(s => {
          const str = `${s.nombre} ${s.categoria || ''}`.toLowerCase();
          if (paquete === 'Premium') {
            return str.includes('premium');
          } else {
            return !str.includes('premium');
          }
        });

        // Fallback: si el filtro es muy estricto y no deja nada, mostramos todo
        const serviciosAMostrar = serviciosFiltrados.length > 0 ? serviciosFiltrados : servicios;

        const isPrincipal = (name) => {
          const lower = name.toLowerCase();
          if (lower.includes('lavado')) {
             if (lower.includes('techo') || lower.includes('tapiz') || lower.includes('alfombra') || lower.includes('salón')) return false;
             return true;
          }
          if (lower.includes('exterior') || lower.includes('completo') || lower === 'premium' || lower === 'clásico') return true;
          return false;
        };

        const principales = serviciosAMostrar.filter(s => isPrincipal(s.nombre));
        const adicionales = serviciosAMostrar.filter(s => !isPrincipal(s.nombre));

        let serviceButtons = [];
        
        principales.forEach(s => {
          serviceButtons.push({
            label: `🚗 ${s.nombre} — Bs. ${s.precio}`,
            value: `SERVICE_${s.id}`,
            id: s.id,
            nombre: s.nombre,
            precio: s.precio,
          });
        });

        if (adicionales.length > 0) {
          // Si no hay principales (raro), no agregamos el separador de extras para que no se vea feo, o sí lo agregamos igual
          if (principales.length > 0) {
            serviceButtons.push({
              isSeparator: true,
              label: 'Complementa tu lavado con:'
            });
          }
          
          adicionales.forEach(s => {
            serviceButtons.push({
              label: `✨ ${s.nombre} — Bs. ${s.precio}`,
              value: `SERVICE_${s.id}`,
              id: s.id,
              nombre: s.nombre,
              precio: s.precio,
            });
          });
        }

        return {
          text: `🧼 Aquí tienes las opciones para **Lavado ${paquete}**:\n\nSelecciona el servicio que deseas:`,
          source: 'reservation',
          buttons: serviceButtons,
          requestGPS: false,
        };

      case STEPS.ASKING_SERVICE:
        // El input puede ser "SERVICE_uuid" si viene de un botón, o texto
        let servicioSeleccionado = null;

        if (input.startsWith('SERVICE_')) {
          const serviceId = input.replace('SERVICE_', '');
          const { data } = await supabase.from('servicios').select('id, nombre, precio').eq('id', serviceId).single();
          servicioSeleccionado = data;
        } else {
          // Búsqueda por nombre
          const { data: servicios2 } = await supabase.from('servicios').select('id, nombre, precio, categoria');
          if (servicios2) {
            const pq = _reservationState.data.paqueteSeleccionado;
            const serviciosFiltrados2 = servicios2.filter(s => {
              const str = `${s.nombre} ${s.categoria || ''}`.toLowerCase();
              if (pq === 'Premium') return str.includes('premium');
              return !str.includes('premium');
            });
            servicioSeleccionado = serviciosFiltrados2.find(s => 
              s.nombre.toLowerCase().includes(input.toLowerCase())
            );
          }
        }

        if (!servicioSeleccionado) {
          return { text: 'No encontré ese servicio. Por favor, selecciona uno de los botones o escribe el nombre exacto.', source: 'reservation', buttons: null, requestGPS: false };
        }

        _reservationState.data.servicioId = servicioSeleccionado.id;
        _reservationState.data.servicioNombre = servicioSeleccionado.nombre;
        _reservationState.data.servicioPrecio = servicioSeleccionado.precio;
        _reservationState.step = STEPS.ASKING_LOCATION;

        return {
          text: `✅ **${servicioSeleccionado.nombre}** — Bs. ${servicioSeleccionado.precio}\n\n📍 ¿Dónde te recogemos? Puedes:\n- Presionar el botón **"Enviar ubicación"**\n- O escribir tu dirección manualmente`,
          source: 'reservation',
          buttons: null,
          requestGPS: true,
        };

      case STEPS.ASKING_LOCATION:
        if (input.length < 3) {
          return { text: 'Por favor, ingresa una dirección válida o envía tu ubicación GPS.', source: 'reservation', buttons: null, requestGPS: true };
        }
        _reservationState.data.ubicacion = input;
        _reservationState.step = STEPS.ASKING_DATE;

        // Generar botones con fechas próximas
        const dateButtons = this._getNextDates();
        return {
          text: '📅 ¿Para qué **fecha** deseas el servicio?',
          source: 'reservation',
          buttons: dateButtons,
          requestGPS: false,
        };

      case STEPS.ASKING_DATE:
        const parsedDate = this._parseDate(input);
        if (!parsedDate) {
          return { text: 'Formato de fecha no válido. Selecciona uno de los botones o escribe en formato **DD/MM/YYYY**.', source: 'reservation', buttons: this._getNextDates(), requestGPS: false };
        }
        _reservationState.data.fechaReserva = parsedDate;
        _reservationState.step = STEPS.ASKING_TIME;

        // Botones de hora
        const timeButtons = [
          { label: '🕘 08:00', value: '08:00' },
          { label: '🕥 08:30', value: '08:30' },
          { label: '🕙 09:00', value: '09:00' },
          { label: '🕦 09:30', value: '09:30' },
          { label: '🕚 10:00', value: '10:00' },
          { label: '🕛 10:30', value: '10:30' },
          { label: '🕐 11:00', value: '11:00' },
          { label: '🕜 11:30', value: '11:30' },
          { label: '🕑 14:00', value: '14:00' },
          { label: '🕝 14:30', value: '14:30' },
          { label: '🕒 15:00', value: '15:00' },
          { label: '🕞 15:30', value: '15:30' },
          { label: '🕓 16:00', value: '16:00' },
          { label: '🕟 16:30', value: '16:30' },
          { label: '🕔 17:00', value: '17:00' },
          { label: '🕠 17:30', value: '17:30' },
        ];

        return {
          text: '🕐 ¿A qué **hora** prefieres?\n\nSelecciona o escribe la hora (formato HH:MM):',
          source: 'reservation',
          buttons: timeButtons,
          requestGPS: false,
        };

      case STEPS.ASKING_TIME:
        const parsedTime = this._parseTime(input);
        if (!parsedTime) {
          return { text: 'Formato de hora no válido. Escribe en formato **HH:MM** (ej: 10:30).', source: 'reservation', buttons: null, requestGPS: false };
        }
        _reservationState.data.horaReserva = parsedTime;
        _reservationState.step = STEPS.CONFIRMING;

        const d = _reservationState.data;
        const confirmButtons = [
          { label: '✅ Confirmar Reserva', value: 'CONFIRMAR_SI' },
          { label: '❌ Cancelar', value: 'CONFIRMAR_NO' },
        ];

        return {
          text: `📋 **Resumen de tu Reserva:**\n\n👤 **Nombre:** ${d.clienteNombre}\n📱 **WhatsApp:** ${d.clienteTelefono}\n🚗 **Vehículo:** ${d.vehiculo}\n🧼 **Servicio:** ${d.servicioNombre}\n💰 **Precio:** Bs. ${d.servicioPrecio}\n📍 **Ubicación:** ${d.ubicacion}\n📅 **Fecha:** ${d.fechaReserva}\n🕐 **Hora:** ${d.horaReserva}\n\n¿Todo correcto?`,
          source: 'reservation',
          buttons: confirmButtons,
          requestGPS: false,
        };

      case STEPS.CONFIRMING:
        if (input === 'CONFIRMAR_NO' || input.toLowerCase().includes('cancel')) {
          return this.cancel();
        }

        if (input === 'CONFIRMAR_SI' || input.toLowerCase().includes('si') || input.toLowerCase().includes('sí') || input.toLowerCase().includes('confirmar')) {
          // Fase 6: Validación de Geofencing
          const isAllowed = await geofencingService.isLocationAllowed(_reservationState.data.ubicacion);
          if (!isAllowed) {
            _reservationState = null;
            return {
              text: "⚠️ Lo sentimos. Actualmente nuestra cobertura llega únicamente hasta las zonas habilitadas.\n\nPor políticas de la empresa, no podemos agendar tu servicio.",
              source: 'reservation',
              buttons: null,
              requestGPS: false,
            };
          }

          // Crear la reserva en Supabase (misma lógica que ServiciosCatalog)
          const result = await this._createReservation();
          _reservationState.step = STEPS.DONE;
          
          if (result.success) {
            const reserva = result.data;
            const hoy = new Date().toISOString().split('T')[0];
            const isHoy = reserva.fechaReserva === hoy;
            const mensajeExtra = isHoy ? '\n\n🛵 **Tiempo estimado de llegada:** 30 a 50 minutos.' : '';

            _reservationState = null; // Limpiar estado
            return {
              text: `🎉 **¡Reserva Confirmada!**\n\n✅ Tu reserva ha sido registrada exitosamente.\n\n📋 **Detalles:**\n• Servicio: ${reserva.servicioNombre}\n• Fecha: ${reserva.fechaReserva} a las ${reserva.horaReserva}\n• Precio: Bs. ${reserva.servicioPrecio}${mensajeExtra}\n\nPronto un trabajador se pondrá en contacto contigo. ¡Gracias por confiar en **Lavamóvil Norte**! 🚗✨`,
              source: 'reservation-done',
              buttons: null,
              requestGPS: false,
              chatSessionId: result.chatSessionId,
              reservaId: result.reservaId,
            };
          } else {
            _reservationState = null;
            return {
              text: `⚠️ Hubo un error al guardar la reserva: ${result.error}\n\nPor favor intenta de nuevo o contacta al administrador.`,
              source: 'reservation',
              buttons: null,
              requestGPS: false,
            };
          }
        }

        return {
          text: 'Por favor selecciona **Confirmar Reserva** o **Cancelar**.',
          source: 'reservation',
          buttons: [
            { label: '✅ Confirmar Reserva', value: 'CONFIRMAR_SI' },
            { label: '❌ Cancelar', value: 'CONFIRMAR_NO' },
          ],
          requestGPS: false,
        };

      default:
        _reservationState = null;
        return null;
    }
  }

  // ==================== HELPERS PRIVADOS ====================

  /**
   * Obtiene los servicios disponibles de Supabase
   */
  static async _getServicios() {
    const { data, error } = await supabase
      .from('servicios')
      .select('id, nombre, precio, categoria')
      .order('precio', { ascending: true });
    
    if (error) {
      console.error('Error fetching servicios:', error);
      return [];
    }
    return data || [];
  }

  /**
   * Crea la reserva en Supabase (misma lógica que ServiciosCatalog.submitReservation)
   */
  static async _createReservation() {
    const d = _reservationState.data;

    try {
      const formattedHora = d.horaReserva.length === 5 ? `${d.horaReserva}:00` : d.horaReserva;

      // Buscar trabajador disponible
      const { data: trabajadores } = await supabase
        .from('trabajadores')
        .select('id')
        .eq('estado_disponibilidad', 'disponible')
        .eq('rol', 'Trabajador')
        .limit(1);

      const trabajadorId = trabajadores && trabajadores.length > 0 ? trabajadores[0].id : null;
      const estadoReserva = trabajadorId ? 'asignado' : 'pendiente';
      const newChatSessionId = `chat_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      let serviciosDetalleJSON = [];
      if (d.servicioId) {
        const { data: sData } = await supabase.from('servicios').select('*').eq('id', d.servicioId).single();
        if (sData) {
          serviciosDetalleJSON = [{
            id: sData.id,
            nombre: sData.nombre,
            categoria: sData.categoria,
            precio: Number(d.servicioPrecio)
          }];
        }
      }

      const { data: insertData, error } = await supabase.from('reservas').insert([{
        cliente_nombre: `${d.clienteNombre} - Tel: ${d.clienteTelefono}`,
        vehiculo: d.vehiculo,
        ubicacion_gps: d.ubicacion,
        fecha_reserva: d.fechaReserva,
        hora_reserva: formattedHora,
        servicio_id: d.servicioId,
        precio_total: d.servicioPrecio,
        estado: 'Reservado',
        trabajador_id: trabajadorId,
        estado_reserva: estadoReserva,
        chat_session_id: newChatSessionId,
        servicios_detalle: serviciosDetalleJSON
      }]).select();

      if (error) {
        return { success: false, error: error.message };
      }

      // Notificación
      await supabase.from('notificaciones').insert([{
        mensaje: `📱 Nueva reserva desde Chatbot: ${d.clienteNombre} - ${d.servicioNombre}`,
        tipo: 'info'
      }]);

      return {
        success: true,
        data: d,
        reservaId: insertData?.[0]?.id,
        chatSessionId: newChatSessionId,
      };

    } catch (e) {
      console.error('Error creando reserva:', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * Genera botones con las próximas 5 fechas disponibles
   */
  static _getNextDates() {
    const dates = [];
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dayName = dayNames[d.getDay()];
      const formatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      const isoDate = d.toISOString().split('T')[0]; // YYYY-MM-DD for DB
      dates.push({
        label: `📅 ${i === 0 ? 'Hoy' : dayName} ${formatted}`,
        value: isoDate,
      });
    }
    return dates;
  }

  /**
   * Parsea múltiples formatos de fecha a YYYY-MM-DD
   */
  static _parseDate(input) {
    // Si ya es YYYY-MM-DD (de un botón)
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;

    // DD/MM/YYYY
    const match1 = input.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (match1) {
      return `${match1[3]}-${match1[2].padStart(2, '0')}-${match1[1].padStart(2, '0')}`;
    }

    // DD/MM (asume año actual)
    const match2 = input.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
    if (match2) {
      const year = new Date().getFullYear();
      return `${year}-${match2[2].padStart(2, '0')}-${match2[1].padStart(2, '0')}`;
    }

    return null;
  }

  /**
   * Parsea hora de múltiples formatos a HH:MM
   */
  static _parseTime(input) {
    // HH:MM exacto
    const match = input.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const h = parseInt(match[1]);
      const m = parseInt(match[2]);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    }

    // Solo hora (ej: "10" → "10:00")
    const matchSingle = input.match(/^(\d{1,2})$/);
    if (matchSingle) {
      const h = parseInt(matchSingle[1]);
      if (h >= 0 && h <= 23) {
        return `${String(h).padStart(2, '0')}:00`;
      }
    }

    return null;
  }
}

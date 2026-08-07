import { supabase } from '../../supabase';

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
        _reservationState.data.vehiculo = input;
        _reservationState.step = STEPS.ASKING_SERVICE;
        
        // Obtener servicios disponibles de Supabase
        const servicios = await this._getServicios();
        if (servicios.length === 0) {
          return {
            text: '⚠️ No hay servicios configurados en este momento. Contacta al administrador.',
            source: 'reservation',
            buttons: null,
            requestGPS: false,
          };
        }

        const serviceButtons = servicios.map(s => ({
          label: `${s.nombre} — Bs. ${s.precio}`,
          value: `SERVICE_${s.id}`,
          id: s.id,
          nombre: s.nombre,
          precio: s.precio,
        }));

        return {
          text: '🧼 Selecciona el **servicio** que deseas:',
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
          const { data: servicios2 } = await supabase.from('servicios').select('id, nombre, precio');
          if (servicios2) {
            servicioSeleccionado = servicios2.find(s => 
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
          { label: '🕙 09:00', value: '09:00' },
          { label: '🕥 10:00', value: '10:00' },
          { label: '🕦 11:00', value: '11:00' },
          { label: '🕐 14:00', value: '14:00' },
          { label: '🕑 15:00', value: '15:00' },
          { label: '🕓 16:00', value: '16:00' },
          { label: '🕔 17:00', value: '17:00' },
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
          // Crear la reserva en Supabase (misma lógica que ServiciosCatalog)
          const result = await this._createReservation();
          _reservationState.step = STEPS.DONE;
          
          if (result.success) {
            const reserva = result.data;
            _reservationState = null; // Limpiar estado
            return {
              text: `🎉 **¡Reserva Confirmada!**\n\n✅ Tu reserva ha sido registrada exitosamente.\n\n📋 **Detalles:**\n• Servicio: ${reserva.servicioNombre}\n• Fecha: ${reserva.fechaReserva} a las ${reserva.horaReserva}\n• Precio: Bs. ${reserva.servicioPrecio}\n\nPronto un trabajador se pondrá en contacto contigo. ¡Gracias por confiar en **Lavamóvil Norte**! 🚗✨`,
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
    
    for (let i = 1; i <= 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dayName = dayNames[d.getDay()];
      const formatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      const isoDate = d.toISOString().split('T')[0]; // YYYY-MM-DD for DB
      dates.push({
        label: `📅 ${dayName} ${formatted}`,
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

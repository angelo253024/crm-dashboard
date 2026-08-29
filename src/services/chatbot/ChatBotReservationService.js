import { supabase } from '../../supabase';
import { GeminiService } from './GeminiService';
import { geofencingService } from '../geofencing/GeofencingService';
import { VehicleClassifier } from './VehicleClassifier';
import { autoAssignWorker } from '../../utils/autoAssignWorker';

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
  ASKING_USE_SAVED_PROFILE: 'ASKING_USE_SAVED_PROFILE',
  ASKING_NAME: 'ASKING_NAME',
  ASKING_PHONE: 'ASKING_PHONE',
  ASKING_VEHICLE: 'ASKING_VEHICLE',
  ASKING_VEHICLE_CATEGORY: 'ASKING_VEHICLE_CATEGORY',
  ASKING_PACKAGE: 'ASKING_PACKAGE',
  ASKING_SERVICE: 'ASKING_SERVICE',
  ASKING_ADDITIONAL_PROMPT: 'ASKING_ADDITIONAL_PROMPT',
  ASKING_ADDITIONAL_SERVICE: 'ASKING_ADDITIONAL_SERVICE',
  ASKING_LOCATION: 'ASKING_LOCATION',
  ASKING_DATE: 'ASKING_DATE',
  ASKING_TIME: 'ASKING_TIME',
  CONFIRM_DELAY: 'CONFIRM_DELAY',
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
      step: STEPS.ASKING_PHONE, // Ahora pedimos el teléfono primero
      savedProfile: null,
      data: {
        clienteNombre: '',
        clienteTelefono: '',
        vehiculo: '',
        tamanoServicio: '',
        clasificacionDetalle: null,
        paqueteSeleccionado: '',
        servicioId: null,
        servicioNombre: '',
        servicioPrecio: 0,
        serviciosAdicionales: [],
        ubicacion: '',
        fechaReserva: '',
        horaReserva: '',
      }
    };

    return {
      text: '¡Perfecto! Vamos a agendar tu cita de lavado. 📅\n\nPara empezar, por favor indícame tu número de **WhatsApp**:',
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

      case STEPS.ASKING_USE_SAVED_PROFILE:
        if (input === 'PROFILE_USE_SAVED' || ['si', 'sí', 'usar', 'confirmar', 'mis datos', 'usar mis datos'].includes(input.toLowerCase())) {
          if (_reservationState.data.vehiculo) {
            _reservationState.step = STEPS.ASKING_PACKAGE;
            return {
              text: `👍 Usaremos tus datos registrados:\n👤 **${_reservationState.data.clienteNombre}** (${_reservationState.data.clienteTelefono})\n🚗 **${_reservationState.data.vehiculo}**\n\nSelecciona el tipo de paquete que deseas:`,
              source: 'reservation',
              buttons: [
                { label: '🟦 Lavado Clásico', value: 'CLASICO' },
                { label: '⭐ Lavado Premium (Recomendado)', value: 'PREMIUM' },
                { label: '🎨 Personaliza tu lavado', value: 'PERSONALIZA' }
              ],
              requestGPS: false,
            };
          } else {
            _reservationState.step = STEPS.ASKING_VEHICLE;
            return {
              text: `👍 Usaremos tu nombre **${_reservationState.data.clienteNombre}** y teléfono **${_reservationState.data.clienteTelefono}**.\n\n🚗 ¿Cuál es la **marca y modelo** de tu vehículo?`,
              source: 'reservation',
              buttons: null,
              requestGPS: false,
            };
          }
        } else {
          _reservationState.data.clienteNombre = '';
          // No limpiamos el teléfono porque lo acaba de ingresar
          _reservationState.data.vehiculo = '';
          _reservationState.data.ubicacion = '';
          _reservationState.step = STEPS.ASKING_NAME;
          return {
            text: 'Entendido. Vamos a registrar nuevos datos. 📅\n\n¿Cuál es tu **nombre completo**?',
            source: 'reservation',
            buttons: null,
            requestGPS: false,
          };
        }

      case STEPS.ASKING_PHONE:
        const cleanPhone = input.replace(/\D/g, '');
        if (cleanPhone.length < 7) {
          return { text: 'Por favor, ingresa un número de teléfono válido (mínimo 7 dígitos).', source: 'reservation', buttons: null, requestGPS: false };
        }
        _reservationState.data.clienteTelefono = input;
        
        // 1. Intentar buscar perfil en Supabase usando el teléfono
        let knownProfile = null;
        try {
          const { data: clientDB } = await supabase
            .from('clientes')
            .select('nombre, vehiculo')
            .eq('telefono', cleanPhone)
            .order('created_at', { ascending: false })
            .limit(1);

          if (clientDB && clientDB.length > 0) {
            knownProfile = {
              nombre: clientDB[0].nombre,
              telefono: input,
              vehiculo: clientDB[0].vehiculo
            };
          }
        } catch (e) { console.error(e); }

        // 2. Fallback a localStorage
        if (!knownProfile) {
          try {
            if (typeof localStorage !== 'undefined') {
              const stored = localStorage.getItem('lavamovil_client_profile');
              if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.telefono && parsed.telefono.replace(/\D/g, '') === cleanPhone) {
                  knownProfile = parsed;
                }
              }
            }
          } catch(e) {}
        }

        if (knownProfile && knownProfile.nombre) {
          _reservationState.savedProfile = knownProfile;
          _reservationState.data.clienteNombre = knownProfile.nombre;
          _reservationState.data.vehiculo = knownProfile.vehiculo || '';
          _reservationState.step = STEPS.ASKING_USE_SAVED_PROFILE;

          return {
            text: `¡Hola de nuevo, **${knownProfile.nombre}**! 👋✨\n\nVeo que tienes registrado el vehículo **${knownProfile.vehiculo || 'sin especificar'}**.\n\n¿Deseas agendar usando tus datos registrados?`,
            source: 'reservation',
            buttons: [
              { label: '✅ Usar mis datos registrados', value: 'PROFILE_USE_SAVED' },
              { label: '✏️ Ingresar otros datos', value: 'PROFILE_NEW' }
            ],
            requestGPS: false,
          };
        }

        // Si no se encontró perfil, pedimos el nombre
        _reservationState.step = STEPS.ASKING_NAME;
        return {
          text: `Gracias. ¿Cuál es tu **nombre completo**?`,
          source: 'reservation',
          buttons: null,
          requestGPS: false,
        };

      case STEPS.ASKING_NAME:
        if (input.length < 2) {
          return { text: 'Por favor, ingresa un nombre válido (mínimo 2 caracteres).', source: 'reservation', buttons: null, requestGPS: false };
        }
        _reservationState.data.clienteNombre = input;
        _reservationState.step = STEPS.ASKING_VEHICLE;
        return {
          text: `Gracias, **${input}** 👋\n\n🚗 ¿Cuál es la **marca y modelo** de tu vehículo?\n\n_Ejemplo: Toyota Corolla, Suzuki Alto, Ford Explorer_`,
          source: 'reservation',
          buttons: null,
          requestGPS: false,
        };

      case STEPS.ASKING_VEHICLE:
        if (input.length < 2) {
          return { text: 'Por favor, escribe la marca y modelo de tu vehículo.', source: 'reservation', buttons: null, requestGPS: false };
        }

        // Clasificación de vehículo usando el motor híbrido (IA Gemini + Reglas deterministas)
        const clasificacion = await VehicleClassifier.classify(input);

        // Si la confianza es baja (< 80%), solicitar especificación de marca y modelo
        if (clasificacion.confianza < 80) {
          return {
            text: `🚗 No pude determinar el modelo exacto de tu vehículo ("${input}").\n\nPor favor, indícame la **marca y modelo exacto** (ej: _Toyota Hilux, Ford Ranger, Suzuki Vitara, Toyota Corolla_):`,
            source: 'reservation',
            buttons: null,
            requestGPS: false,
          };
        }

        // Guardar tamaño y detalles de clasificación
        _reservationState.data.tamanoServicio = clasificacion.tamanoServicio;
        _reservationState.data.clasificacionDetalle = clasificacion;

        const nombreVehiculo = clasificacion.marca 
          ? `${clasificacion.marca} ${clasificacion.modelo}`.trim() 
          : clasificacion.modelo;
        const vehiculoIdentificado = `${nombreVehiculo} (${clasificacion.tipo})`;
        _reservationState.data.vehiculo = vehiculoIdentificado;

        // Si es MOTO
        if (clasificacion.tamanoServicio === 'MOTO') {
          return {
            text: `🛵 Detecté que tu vehículo es un **${vehiculoIdentificado}**.\n\n⚠️ Actualmente, el monto mínimo para reservas a domicilio es de **100 Bs.**, por lo que no estamos agendando servicios para motos o bicicletas.\n\nPor favor, ingresa la marca y modelo de un **automóvil** para continuar:`,
            source: 'reservation',
            buttons: null,
            requestGPS: false,
          };
        }

        // Si es automóvil (P, M, L, XL)
        _reservationState.step = STEPS.ASKING_PACKAGE;
        return {
          text: `🚙 Detecté que tu vehículo es un **${vehiculoIdentificado}**.\n\nPor sus características, corresponde al tamaño de servicio **${clasificacion.tamanoServicio}**.\n\nSelecciona el tipo de paquete que deseas:`,
          source: 'reservation',
          buttons: [
            { label: '🟦 Lavado Clásico', value: 'CLASICO' },
            { label: '⭐ Lavado Premium (Recomendado)', value: 'PREMIUM' },
            { label: '✏️ Cambiar Vehículo', value: 'CHANGE_VEHICLE' }
          ],
          requestGPS: false,
        };

      case STEPS.ASKING_VEHICLE_CATEGORY:
        // El usuario seleccionó o escribió una categoría manualmente
        const categoriaManual = ['Pequeño', 'SUV', 'Camioneta', 'Van'].find(c => input.toLowerCase().includes(c.toLowerCase())) || input;
        _reservationState.data.vehiculo = `${_reservationState.data.vehiculo} - ${categoriaManual}`;
        
        let tamanoManual = 'M';
        if (categoriaManual.toLowerCase().includes('peque')) tamanoManual = 'P';
        else if (categoriaManual.toLowerCase().includes('camioneta') || categoriaManual.toLowerCase().includes('van')) tamanoManual = 'XL';
        else if (categoriaManual.toLowerCase().includes('suv')) tamanoManual = 'L';

        _reservationState.data.tamanoServicio = tamanoManual;
        _reservationState.step = STEPS.ASKING_PACKAGE;
        
        return {
          text: `¡Perfecto! Para categoría **${categoriaManual}** (tamaño **${tamanoManual}**), selecciona el tipo de paquete:`,
          source: 'reservation',
          buttons: [
            { label: '🟦 Lavado Clásico', value: 'CLASICO' },
            { label: '⭐ Lavado Premium (Recomendado)', value: 'PREMIUM' },
            { label: '✏️ Cambiar Vehículo', value: 'CHANGE_VEHICLE' }
          ],
          requestGPS: false,
        };

      case STEPS.ASKING_PACKAGE:
        if (input === 'CHANGE_VEHICLE' || input.toLowerCase().includes('cambiar vehiculo') || input.toLowerCase().includes('cambiar vehículo')) {
          _reservationState.data.tamanoServicio = '';
          _reservationState.data.vehiculo = '';
          _reservationState.step = STEPS.ASKING_VEHICLE;
          return {
            text: '🚗 Por favor, ingresa la marca y modelo exacto de tu vehículo:',
            source: 'reservation',
            buttons: null,
            requestGPS: false,
          };
        }

        let paquete = '';
        if (input === 'CLASICO' || input.toLowerCase().includes('clásico') || input.toLowerCase().includes('clasico')) {
          paquete = 'Clásico';
        } else if (input === 'PREMIUM' || input.toLowerCase().includes('premium')) {
          paquete = 'Premium';
        } else if (input === 'BICIS_MOTOS' || input.toLowerCase().includes('bici') || input.toLowerCase().includes('moto')) {
          paquete = 'Bicis y Motos';
        } else if (input === 'PERSONALIZA' || input.toLowerCase().includes('personaliza')) {
          paquete = 'Personaliza tu lavado';
        } else {
          return { 
            text: 'Por favor, selecciona una opción válida.', 
            source: 'reservation', 
            buttons: [
              { label: '🟦 Lavado Clásico', value: 'CLASICO' }, 
              { label: '⭐ Lavado Premium (Recomendado)', value: 'PREMIUM' },
              { label: '✏️ Cambiar Vehículo', value: 'CHANGE_VEHICLE' }
            ], 
            requestGPS: false 
          };
        }

        _reservationState.data.paqueteSeleccionado = paquete;
        _reservationState.step = STEPS.ASKING_SERVICE;

        // Obtener servicios existentes de la BD
        const serviciosBD = await this._getServicios();
        if (!serviciosBD || serviciosBD.length === 0) {
          return {
            text: '⚠️ No hay servicios configurados en este momento. Contacta al administrador.',
            source: 'reservation',
            buttons: null,
            requestGPS: false,
          };
        }

        let serviciosFiltrados = [];
        if (paquete === 'Clásico') {
          serviciosFiltrados = serviciosBD.filter(s => s.categoria === 'Lavado Clásico' || s.nombre.toLowerCase().includes('lavado clásico'));
        } else if (paquete === 'Premium') {
          serviciosFiltrados = serviciosBD.filter(s => s.categoria === 'Lavado Premium' || s.nombre.toLowerCase().includes('lavado premium'));
        } else if (paquete === 'Bicis y Motos') {
          serviciosFiltrados = serviciosBD.filter(s => s.categoria === 'Lavado Bicis y Motos' || s.nombre.toLowerCase().includes('moto') || s.nombre.toLowerCase().includes('bici'));
        } else if (paquete === 'Personaliza tu lavado') {
          serviciosFiltrados = serviciosBD.filter(s => s.categoria === 'Personaliza tu lavado');
        }

        const tamanoActual = _reservationState.data.tamanoServicio || 'M';

        // Buscar el servicio ÚNICO que corresponda exactamente al tamaño detectado en la BD
        let servicioUnicoBD = null;
        if (tamanoActual === 'MOTO') {
          servicioUnicoBD = serviciosFiltrados.find(s => s.nombre.toLowerCase().includes('moto')) || serviciosFiltrados[0];
        } else {
          servicioUnicoBD = serviciosFiltrados.find(s => {
            const n = s.nombre.toUpperCase();
            return n.includes(`"${tamanoActual}"`) || n.includes(` ${tamanoActual}`) || n.endsWith(tamanoActual);
          });
        }

        // Si existe el servicio exacto en la BD, mostrar ÚNICAMENTE ése con su precio real
        if (servicioUnicoBD) {
          _reservationState.data.servicioId = servicioUnicoBD.id;
          _reservationState.data.servicioNombre = servicioUnicoBD.nombre;
          _reservationState.data.servicioPrecio = Number(servicioUnicoBD.precio);

          return {
            text: `🚙 Para tu **${_reservationState.data.vehiculo}** (tamaño **${tamanoActual}**):\n\n✨ **${servicioUnicoBD.nombre}** — **Bs. ${servicioUnicoBD.precio}**\n\n¿Deseas seleccionar este servicio?`,
            source: 'reservation',
            buttons: [
              { label: `✅ Seleccionar ${servicioUnicoBD.nombre}`, value: `SERVICE_${servicioUnicoBD.id}` },
              { label: '✏️ Cambiar Vehículo', value: 'CHANGE_VEHICLE' }
            ],
            requestGPS: false,
          };
        }

        // Fallback en caso de no encontrar coincidencia exacta de tamaño
        let serviceButtons = serviciosFiltrados.map(s => ({
          label: `🚗 ${s.nombre} — Bs. ${s.precio}`,
          value: `SERVICE_${s.id}`,
          id: s.id,
          nombre: s.nombre,
          precio: s.precio,
        }));

        return {
          text: `🧼 Opciones para **Lavado ${paquete}**:\n\nSelecciona el servicio que deseas:`,
          source: 'reservation',
          buttons: serviceButtons,
          requestGPS: false,
        };

      case STEPS.ASKING_SERVICE:
        if (input === 'CHANGE_VEHICLE' || input.toLowerCase().includes('cambiar vehiculo') || input.toLowerCase().includes('cambiar vehículo')) {
          _reservationState.data.tamanoServicio = '';
          _reservationState.data.vehiculo = '';
          _reservationState.step = STEPS.ASKING_VEHICLE;
          return {
            text: '🚗 Por favor, ingresa la marca y modelo exacto de tu vehículo:',
            source: 'reservation',
            buttons: null,
            requestGPS: false,
          };
        }

        let servicioSeleccionado = null;

        if (input.startsWith('SERVICE_')) {
          const serviceId = input.replace('SERVICE_', '');
          const { data } = await supabase.from('servicios').select('id, nombre, precio, categoria').eq('id', serviceId).single();
          servicioSeleccionado = data;
        } else {
          const { data: servicios2 } = await supabase.from('servicios').select('id, nombre, precio, categoria').eq('disponible', true);
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
        _reservationState.data.servicioPrecio = Number(servicioSeleccionado.precio);
        _reservationState.data.serviciosAdicionales = [];
        _reservationState.step = STEPS.ASKING_ADDITIONAL_PROMPT;

        return {
          text: `✅ Seleccionaste: **${servicioSeleccionado.nombre}** — Bs. ${servicioSeleccionado.precio}\n\n✨ ¿Deseas **adicionar un servicio extra** a tu lavado? (Ej. Lavado especial para Cerámicos, Limpieza de Motor, Lustrado, etc.)`,
          source: 'reservation',
          buttons: [
            { label: '➕ Sí, agregar servicio extra', value: 'EXTRA_SI' },
            { label: '➡️ No, continuar con la reserva', value: 'EXTRA_NO' }
          ],
          requestGPS: false,
        };

      case STEPS.ASKING_ADDITIONAL_PROMPT:
        const isSi = input === 'EXTRA_SI' || ['si', 'sí', 'agregar', 'adicionar', 'extra', 'mas', 'más'].includes(input.toLowerCase());
        const isNo = input === 'EXTRA_NO' || input === 'EXTRA_DONE' || ['no', 'continuar', 'listo', 'ninguno', 'pasar', 'siguiente'].includes(input.toLowerCase());

        if (isSi) {
          _reservationState.step = STEPS.ASKING_ADDITIONAL_SERVICE;
          const todosServicios = await this._getServicios();
          
          const selectedIds = [
            _reservationState.data.servicioId,
            ...(_reservationState.data.serviciosAdicionales || []).map(a => a.id)
          ];

          const extrasDisponibles = todosServicios.filter(s => !selectedIds.includes(s.id));

          let extraButtons = [];
          extrasDisponibles.forEach(s => {
            extraButtons.push({
              label: `✨ ${s.nombre} — Bs. ${s.precio}`,
              value: `EXTRA_SERVICE_${s.id}`,
              id: s.id,
              nombre: s.nombre,
              precio: s.precio,
            });
          });

          extraButtons.push({
            label: '🏁 Listo, continuar sin más extras',
            value: 'EXTRA_DONE'
          });

          return {
            text: '✨ Selecciona el servicio adicional que deseas agregar:',
            source: 'reservation',
            buttons: extraButtons,
            requestGPS: false,
          };
        }

        if (isNo) {
          const totalAcumulado = _reservationState.data.servicioPrecio + (_reservationState.data.serviciosAdicionales || []).reduce((sum, s) => sum + Number(s.precio), 0);
          if (totalAcumulado < 100) {
            _reservationState.step = STEPS.ASKING_ADDITIONAL_PROMPT;
            return {
              text: `⚠️ **Monto Mínimo No Alcanzado**\n\nEl pedido mínimo para servicio a domicilio es de **100 Bs**.\nTu total actual es de **Bs. ${totalAcumulado}**.\n\nPor favor, selecciona un servicio adicional para completar el monto mínimo:`,
              source: 'reservation',
              buttons: [
                { label: '➕ Sí, agregar servicio extra', value: 'EXTRA_SI' }
              ],
              requestGPS: false,
            };
          }

          _reservationState.step = STEPS.ASKING_LOCATION;
          return {
            text: `📍 ¿Dónde te recogemos? Puedes:\n- Presionar el botón **"Enviar ubicación"**\n- O escribir tu dirección manualmente`,
            source: 'reservation',
            buttons: null,
            requestGPS: true,
          };
        }

        return {
          text: 'Por favor selecciona si deseas agregar un servicio adicional:',
          source: 'reservation',
          buttons: [
            { label: '➕ Sí, agregar servicio extra', value: 'EXTRA_SI' },
            { label: '➡️ No, continuar con la reserva', value: 'EXTRA_NO' }
          ],
          requestGPS: false,
        };

      case STEPS.ASKING_ADDITIONAL_SERVICE:
        if (input === 'EXTRA_DONE' || ['no', 'continuar', 'listo', 'ninguno', 'pasar', 'siguiente'].includes(input.toLowerCase())) {
          const totalAcumulado = _reservationState.data.servicioPrecio + (_reservationState.data.serviciosAdicionales || []).reduce((sum, s) => sum + Number(s.precio), 0);
          if (totalAcumulado < 100) {
            _reservationState.step = STEPS.ASKING_ADDITIONAL_PROMPT;
            return {
              text: `⚠️ **Monto Mínimo No Alcanzado**\n\nEl pedido mínimo para servicio a domicilio es de **100 Bs**.\nTu total actual es de **Bs. ${totalAcumulado}**.\n\nPor favor, selecciona un servicio adicional para completar el monto mínimo:`,
              source: 'reservation',
              buttons: [
                { label: '➕ Sí, agregar servicio extra', value: 'EXTRA_SI' }
              ],
              requestGPS: false,
            };
          }

          _reservationState.step = STEPS.ASKING_LOCATION;
          return {
            text: `📍 ¿Dónde te recogemos? Puedes:\n- Presionar el botón **"Enviar ubicación"**\n- O escribir tu dirección manualmente`,
            source: 'reservation',
            buttons: null,
            requestGPS: true,
          };
        }

        let extraSeleccionado = null;
        if (input.startsWith('EXTRA_SERVICE_')) {
          const serviceId = input.replace('EXTRA_SERVICE_', '');
          const { data } = await supabase.from('servicios').select('id, nombre, precio, categoria').eq('id', serviceId).single();
          extraSeleccionado = data;
        } else {
          const { data: servicios2 } = await supabase.from('servicios').select('id, nombre, precio, categoria').eq('disponible', true);
          if (servicios2) {
            extraSeleccionado = servicios2.find(s => s.nombre.toLowerCase().includes(input.toLowerCase()));
          }
        }

        if (!extraSeleccionado) {
          return { text: 'No encontré ese servicio extra. Por favor, selecciona uno de los botones o presiona **Listo, continuar**.', source: 'reservation', buttons: null, requestGPS: false };
        }

        if (!_reservationState.data.serviciosAdicionales) {
          _reservationState.data.serviciosAdicionales = [];
        }
        
        _reservationState.data.serviciosAdicionales.push({
          id: extraSeleccionado.id,
          nombre: extraSeleccionado.nombre,
          precio: Number(extraSeleccionado.precio),
          categoria: extraSeleccionado.categoria || 'Otros'
        });

        const totalAcumulado = _reservationState.data.servicioPrecio + _reservationState.data.serviciosAdicionales.reduce((sum, s) => sum + Number(s.precio), 0);

        _reservationState.step = STEPS.ASKING_ADDITIONAL_PROMPT;

        return {
          text: `👍 ¡Agregado! **${extraSeleccionado.nombre}** — Bs. ${extraSeleccionado.precio}\n\n💰 Total acumulado: **Bs. ${totalAcumulado}**\n\n¿Deseas agregar **otro servicio adicional**?`,
          source: 'reservation',
          buttons: [
            { label: '➕ Agregar otro extra', value: 'EXTRA_SI' },
            { label: '➡️ No, continuar a la ubicación', value: 'EXTRA_DONE' }
          ],
          requestGPS: false,
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
        
        const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
        if (parsedDate < todayStr) {
          return { text: 'No puedes reservar en una fecha pasada. Por favor selecciona una fecha válida o uno de los botones.', source: 'reservation', buttons: this._getNextDates(), requestGPS: false };
        }
        
        _reservationState.data.fechaReserva = parsedDate;
        _reservationState.step = STEPS.ASKING_TIME;

        let availableTimeButtons = [];

        try {
          const parseMin = (tStr) => {
            if (!tStr) return -1;
            const parts = String(tStr).split(':');
            if (parts.length < 2) return -1;
            return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
          };

          // Validar disponibilidad de fecha
          const { data: dispoData } = await supabase
            .from('disponibilidad_fechas')
            .select('*')
            .eq('fecha', parsedDate);

          let allowedSlots = [];

          if (dispoData && dispoData.length > 0) {
            const d = dispoData[0];
            if (d.cerrado) {
              _reservationState.step = STEPS.ASKING_DATE;
              return {
                text: '⚠️ Lo sentimos, no hay atención en la fecha seleccionada porque está marcado como día cerrado.\n\nPor favor, selecciona o escribe **otra fecha**:',
                source: 'reservation',
                buttons: this._getNextDates(),
                requestGPS: false
              };
            }
            if (d.tipo === 'slots' && d.slots && d.slots.length > 0) {
              allowedSlots = d.slots;
            } else {
              const startMin = parseMin(d.hora_inicio);
              const endMin = parseMin(d.hora_fin);
              const defaultSlots = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
              allowedSlots = defaultSlots.filter(s => {
                const sMin = parseMin(s);
                return sMin >= startMin && sMin <= endMin;
              });
            }
          } else {
             allowedSlots = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
          }

          const { data: existingReservasDate } = await supabase
            .from('reservas')
            .select('hora_reserva, hora, estado')
            .eq('fecha_reserva', parsedDate)
            .neq('estado', 'Cancelado');

          if (existingReservasDate && existingReservasDate.length >= 10) {
            _reservationState.step = STEPS.ASKING_DATE;
            return {
              text: '⚠️ Por hoy alcanzamos nuestro límite de reservas. Solo se puede agendar cita manualmente contactando al administrador.\n\nPor favor, selecciona o escribe **otra fecha**:',
              source: 'reservation',
              buttons: this._getNextDates(),
              requestGPS: false
            };
          }

          const bookedMins = (existingReservasDate || []).map(r => parseMin(r.hora_reserva || r.hora)).filter(m => m !== -1);

          const validSlots = allowedSlots.filter(slot => {
            const btnMin = parseMin(slot);
            return !bookedMins.some(bMin => Math.abs(btnMin - bMin) < 60);
          });

          const clockEmojis = {
            '08:00': '🕘', '08:30': '🕤', '09:00': '🕙', '09:30': '🕥', '10:00': '🕥', '10:30': '🕦', '11:00': '🕦', '11:30': '🕛',
            '12:00': '🕛', '12:30': '🕧', '13:00': '🕐', '13:30': '🕜', '14:00': '🕑', '14:30': '🕝', '15:00': '🕒', '15:30': '🕞',
            '16:00': '🕓', '16:30': '🕟', '17:00': '🕔', '17:30': '🕠', '18:00': '🕕', '18:30': '🕡'
          };

          availableTimeButtons = validSlots.map(slot => ({
            label: `${clockEmojis[slot] || '🕒'} ${slot}`,
            value: slot
          }));
        } catch (e) {
          console.error("Error al verificar disponibilidad de horarios:", e);
        }

        let timePromptMsg = '🕐 ¿A qué **hora** prefieres?\n\nSelecciona o escribe la hora (formato HH:MM):';
        if (availableTimeButtons.length === 0) {
          timePromptMsg = '⚠️ Los horarios estándar están ocupados para esta fecha (requerimos al menos 1 hora de rango entre pedidos).\n\nPor favor escribe un horario disponible (ej: 12:30, 18:00) o ingresa otra fecha.';
        }

        return {
          text: timePromptMsg,
          source: 'reservation',
          buttons: availableTimeButtons.length > 0 ? availableTimeButtons : null,
          requestGPS: false,
        };

      case STEPS.ASKING_TIME:
        const parsedTime = this._parseTime(input);
        if (!parsedTime) {
          return { text: 'Formato de hora no válido. Escribe en formato **HH:MM** (ej: 10:30).', source: 'reservation', buttons: null, requestGPS: false };
        }

        // Validar choque de horario (mínimo 1 hora / 60 min entre reservas)
        try {
          const targetDateStr = _reservationState.data.fechaReserva;
          const { data: existingReservasCheck } = await supabase
            .from('reservas')
            .select('hora_reserva, hora, estado')
            .eq('fecha_reserva', targetDateStr)
            .neq('estado', 'Cancelado');

          const parseMin = (tStr) => {
            if (!tStr) return -1;
            const parts = String(tStr).split(':');
            if (parts.length < 2) return -1;
            return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
          };

          const reqMin = parseMin(parsedTime);
          
          // Validar contra disponibilidad_fechas
          const { data: dispoData } = await supabase
            .from('disponibilidad_fechas')
            .select('*')
            .eq('fecha', targetDateStr);
            
          // Validar si la fecha cae en Domingo
          if (targetDateStr) {
            const dateParts = targetDateStr.split('-');
            if (dateParts.length === 3) {
              const dateObj = new Date(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10));
              if (dateObj.getDay() === 0) {
                _reservationState.step = STEPS.ASKING_DATE;
                return { text: '⚠️ Lo sentimos, los **domingos estamos cerrados**.\n\nNuestro horario de atención es de **Lunes a Sábado de 08:30 AM a 06:00 PM**.\n\nPor favor, selecciona **otra fecha**:', source: 'reservation', buttons: this._getNextDates ? this._getNextDates() : null, requestGPS: false };
              }
            }
          }

          if (dispoData && dispoData.length > 0) {
            const d = dispoData[0];
            if (d.cerrado) {
              _reservationState.step = STEPS.ASKING_DATE;
              return { text: '⚠️ Lo sentimos, no hay atención en la fecha seleccionada porque está marcado como día cerrado.\n\nPor favor, selecciona **otra fecha**:', source: 'reservation', buttons: this._getNextDates ? this._getNextDates() : null, requestGPS: false };
            }
            const startMin = parseMin(d.hora_inicio);
            const endMin = parseMin(d.hora_fin);
            if (reqMin < startMin || reqMin > endMin) {
              return { text: `⚠️ El horario de atención para esta fecha es de ${d.hora_inicio.substring(0,5)} a ${d.hora_fin.substring(0,5)}. Por favor escribe una hora dentro de este rango.`, source: 'reservation', buttons: null, requestGPS: false };
            }
          } else {
            const startMin = parseMin('08:30');
            const endMin = parseMin('18:00');
            if (reqMin < startMin || reqMin > endMin) {
              return { text: `⚠️ El horario de atención general es de 08:30 a 18:00 (Lunes a Sábado). Por favor escribe una hora dentro de este rango.`, source: 'reservation', buttons: null, requestGPS: false };
            }
          }
          const conflictReserva = (existingReservasCheck || []).find(r => {
            const rMin = parseMin(r.hora_reserva || r.hora);
            return rMin !== -1 && Math.abs(reqMin - rMin) < 60;
          });

          if (conflictReserva) {
            _reservationState.data.horaReserva = parsedTime;
            _reservationState.data.hasDelay = true;
            _reservationState.step = STEPS.CONFIRM_DELAY;
            
            return {
              text: `⚠️ **¡Atención!** En este horario nuestros funcionarios están realizando otros servicios.\n\nEl tiempo de demora será de **1 hora aproximadamente** en salir para su ubicación.\n\n¿Qué desea hacer?`,
              source: 'reservation',
              buttons: [
                { label: '➡️ Continuar', value: 'DELAY_CONTINUE' },
                { label: '🕘 Cambiar hora', value: 'DELAY_CHANGE_TIME' },
                { label: '❌ Cancelar pedido', value: 'DELAY_CANCEL' }
              ],
              requestGPS: false
            };
          }
        } catch (e) {
          console.error("Error al validar choque de horario:", e);
        }

        _reservationState.data.horaReserva = parsedTime;
        _reservationState.data.hasDelay = false;
        _reservationState.step = STEPS.CONFIRMING;

        const d = _reservationState.data;
        const extrasResumen = d.serviciosAdicionales || [];
        const totalPriceResumen = d.servicioPrecio + extrasResumen.reduce((sum, s) => sum + Number(s.precio), 0);
        
        let extraListText = '';
        if (extrasResumen.length > 0) {
          extraListText = '\n✨ **Servicios Adicionales:**\n' + extrasResumen.map(s => `• ${s.nombre} — Bs. ${s.precio}`).join('\n') + '\n';
        }

        const confirmButtons = [
          { label: '✅ Confirmar Reserva', value: 'CONFIRMAR_SI' },
          { label: '❌ Cancelar', value: 'CONFIRMAR_NO' },
        ];

        return {
          text: `📋 **Resumen de tu Reserva:**\n\n👤 **Nombre:** ${d.clienteNombre}\n📱 **WhatsApp:** ${d.clienteTelefono}\n🚗 **Vehículo:** ${d.vehiculo}\n🧼 **Servicio Principal:** ${d.servicioNombre} — Bs. ${d.servicioPrecio}\n${extraListText}💰 **Precio Total:** Bs. ${totalPriceResumen}\n📍 **Ubicación:** ${d.ubicacion}\n📅 **Fecha:** ${d.fechaReserva}\n🕐 **Hora:** ${d.horaReserva}\n\n¿Todo correcto?`,
          source: 'reservation',
          buttons: confirmButtons,
          requestGPS: false,
        };

      case STEPS.CONFIRM_DELAY:
        if (input === 'DELAY_CANCEL' || input.toLowerCase().includes('cancel')) {
          return this.cancel();
        }
        if (input === 'DELAY_CHANGE_TIME' || input.toLowerCase().includes('cambiar')) {
          _reservationState.step = STEPS.ASKING_TIME;
          return {
            text: '🕐 ¿A qué **hora** prefieres?\n\nSelecciona o escribe la hora (formato HH:MM):',
            source: 'reservation',
            buttons: null,
            requestGPS: false,
          };
        }
        
        if (input === 'DELAY_CONTINUE' || input.toLowerCase().includes('continuar')) {
          _reservationState.step = STEPS.CONFIRMING;
          const d = _reservationState.data;
          const extrasResumen = d.serviciosAdicionales || [];
          const totalPriceResumen = d.servicioPrecio + extrasResumen.reduce((sum, s) => sum + Number(s.precio), 0);
          
          let extraListText = '';
          if (extrasResumen.length > 0) {
            extraListText = '\n✨ **Servicios Adicionales:**\n' + extrasResumen.map(s => `• ${s.nombre} — Bs. ${s.precio}`).join('\n') + '\n';
          }

          const confirmButtons = [
            { label: '✅ Confirmar Reserva', value: 'CONFIRMAR_SI' },
            { label: '❌ Cancelar', value: 'CONFIRMAR_NO' },
          ];

          return {
            text: `📋 **Resumen de tu Reserva (Con Demora):**\n\n👤 **Nombre:** ${d.clienteNombre}\n📱 **WhatsApp:** ${d.clienteTelefono}\n🚗 **Vehículo:** ${d.vehiculo}\n🧼 **Servicio Principal:** ${d.servicioNombre} — Bs. ${d.servicioPrecio}\n${extraListText}💰 **Precio Total:** Bs. ${totalPriceResumen}\n📍 **Ubicación:** ${d.ubicacion}\n📅 **Fecha:** ${d.fechaReserva}\n🕐 **Hora:** ${d.horaReserva}\n\n¿Todo correcto?`,
            source: 'reservation',
            buttons: confirmButtons,
            requestGPS: false,
          };
        }
        
        return {
          text: 'Por favor selecciona una opción válida.',
          source: 'reservation',
          buttons: [
            { label: '➡️ Continuar', value: 'DELAY_CONTINUE' },
            { label: '🕘 Cambiar hora', value: 'DELAY_CHANGE_TIME' },
            { label: '❌ Cancelar pedido', value: 'DELAY_CANCEL' }
          ],
          requestGPS: false
        };

      case STEPS.CONFIRMING:
        if (input === 'CONFIRMAR_NO' || input.toLowerCase().includes('cancel')) {
          return this.cancel();
        }

        if (input === 'CONFIRMAR_SI' || input.toLowerCase().includes('si') || input.toLowerCase().includes('sí') || input.toLowerCase().includes('confirmar')) {
          // Fase 6: Validación de Geofencing
          const isAllowed = await geofencingService.isLocationAllowed(_reservationState.data.ubicacion);
          if (!isAllowed) {
            const hasGPS = String(_reservationState?.data?.ubicacion || '').match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
            _reservationState = null;
            return {
              text: hasGPS 
                ? "⚠️ Lo sentimos. Actualmente nuestra cobertura llega únicamente hasta las zonas habilitadas.\n\nPor políticas de la empresa, no podemos agendar tu servicio." 
                : "⚠️ Para validar si llegamos a tu zona, necesitas enviarnos tu Ubicación GPS exacta presionando el botón '+', 'Adjuntar' o el clip 📎, y seleccionando 'Ubicación'. No podemos agendar solo con la dirección escrita.\n\nPor favor, intenta iniciar tu reserva nuevamente compartiendo tu ubicación real.",
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
            const demoraMsg = _reservationState.data.hasDelay ? "\n\n⚠️ *Nota: Aceptaste una demora de 1 hora por alta demanda.*" : "";
            _reservationState = null; // Limpiar estado
            return {
              text: `🎉 **¡Reserva Confirmada!**\n\n✅ Tu reserva ha sido registrada exitosamente.\n\n📋 **Detalles:**\n• Servicio: ${reserva.servicioNombre}\n• Fecha: ${reserva.fechaReserva} a las ${reserva.horaReserva}\n• Precio Total: Bs. ${reserva.servicioPrecio}${demoraMsg}\n\nPronto un trabajador se pondrá en contacto contigo. **El tiempo de espera aproximado será de 30 a 40 min** en llegar a su ubicación. ¡Gracias por confiar en **Lavamóvil Norte**! 🚗✨`,
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
      .eq('disponible', true);
    
    if (error) {
      console.error('Error fetching servicios:', error);
      return [];
    }

    let list = data || [];

    const categoryOrder = {
      'Lavado Clásico': 1,
      'Lavado Premium': 2,
      'Lavado Bicis y Motos': 3,
      'Personaliza tu lavado': 4,
      'Otros': 5
    };

    const getSizeOrder = (nombre) => {
      if (!nombre) return 99;
      const n = nombre.toUpperCase();
      if (n.includes('"P"') || n.includes(' "P"') || n.endsWith(' P')) return 1;
      if (n.includes('"M"') || n.includes(' "M"') || n.endsWith(' M')) return 2;
      if (n.includes('"L"') || n.includes(' "L"') || n.endsWith(' L')) return 3;
      if (n.includes('"XL"') || n.includes(' "XL"') || n.endsWith(' XL')) return 4;
      return 10;
    };

    list.sort((a, b) => {
      const catA = categoryOrder[a.categoria] || 99;
      const catB = categoryOrder[b.categoria] || 99;
      if (catA !== catB) return catA - catB;

      const sizeA = getSizeOrder(a.nombre);
      const sizeB = getSizeOrder(b.nombre);
      if (sizeA !== sizeB) return sizeA - sizeB;

      return Number(a.precio) - Number(b.precio);
    });

    return list;
  }

  /**
   * Crea la reserva en Supabase (misma lógica que ServiciosCatalog.submitReservation)
   */
  static async _createReservation() {
    const d = _reservationState.data;

    try {
      const formattedHora = d.horaReserva.length === 5 ? `${d.horaReserva}:00` : d.horaReserva;

      const trabajadorId = await autoAssignWorker(supabase);
      const estadoReserva = 'pendiente';
      const newChatSessionId = `chat_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      let serviciosDetalleJSON = [];
      if (d.servicioId) {
        const { data: sData } = await supabase.from('servicios').select('*').eq('id', d.servicioId).single();
        if (sData) {
          serviciosDetalleJSON.push({
            id: sData.id,
            nombre: sData.nombre,
            categoria: sData.categoria,
            precio: Number(d.servicioPrecio)
          });
        }
      }

      const extras = d.serviciosAdicionales || [];
      extras.forEach(ext => {
        serviciosDetalleJSON.push({
          id: ext.id,
          nombre: ext.nombre,
          categoria: ext.categoria || 'Otros',
          precio: Number(ext.precio)
        });
      });

      const totalPrice = serviciosDetalleJSON.reduce((sum, s) => sum + Number(s.precio), 0);
      const additionalNames = extras.length > 0 ? ` (Adicionales: ${extras.map(s => s.nombre).join(', ')})` : '';
      const finalVehiculo = `${d.vehiculo}${additionalNames}`;

      const { data: insertData, error } = await supabase.from('reservas').insert([{
        cliente_nombre: `${d.clienteNombre} - Tel: ${d.clienteTelefono}`,
        vehiculo: finalVehiculo,
        ubicacion_gps: d.ubicacion,
        fecha_reserva: d.fechaReserva,
        hora_reserva: formattedHora,
        servicio_id: d.servicioId,
        precio_total: totalPrice,
        estado: 'Reservado',
        trabajador_id: trabajadorId,
        estado_reserva: estadoReserva,
        chat_session_id: newChatSessionId,
        servicios_detalle: serviciosDetalleJSON
      }]).select();

      if (error) {
        return { success: false, error: error.message };
      }

      // (Eliminado) No guardar perfil de cliente automáticamente sin permiso
      /*
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('lavamovil_client_profile', JSON.stringify({
            nombre: d.clienteNombre,
            telefono: d.clienteTelefono,
            vehiculo: d.vehiculo ? d.vehiculo.split(' (Adicionales:')[0] : '',
            ubicacion: d.ubicacion
          }));
        }

        await supabase.from('clientes').upsert([{
          nombre: d.clienteNombre,
          telefono: d.clienteTelefono,
          vehiculo: d.vehiculo ? d.vehiculo.split(' (Adicionales:')[0] : '',
          direccion: d.ubicacion
        }], { onConflict: 'telefono' });
      } catch(err) {
        // Ignorar si la tabla de clientes aún no está creada
      }
      */

      // Notificación
      const extrasStr = extras.length > 0 ? ` (+ ${extras.length} extras)` : '';
      await supabase.from('notificaciones').insert([{
        mensaje: `📱 Nueva reserva desde Chatbot: ${d.clienteNombre} - ${d.servicioNombre}${extrasStr}`,
        tipo: 'info'
      }]);

      return {
        success: true,
        data: {
          ...d,
          servicioPrecio: totalPrice
        },
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

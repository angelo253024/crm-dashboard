import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import OneSignal from 'react-onesignal';
import { MapPin, Check, X, Bell, User, Banknote, MessageSquare, Send, Map, PlusCircle, DollarSign, Eye, Edit3 } from 'lucide-react';
import KpiCards from './KpiCards';

// --- Inline Chat Component for Worker ---
function MotoChat({ sessionId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const audioRef = useRef(new Audio('/aternos-notification.mp3'));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchMessages();
    const channel = supabase
      .channel(`chat_${sessionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `session_id=eq.${sessionId}` }, payload => {
        setMessages(prev => {
          // Single source of truth: evitar duplicados por ID real de base de datos
          if (prev.some(m => m.id === payload.new.id)) return prev;
          
          if (payload.new.rol === 'user') {
            audioRef.current.play().catch(e => console.log('Audio autoplay blocked:', e));
          }
          
          return [...prev, payload.new];
        });
      })
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  }, [sessionId]);

  const fetchMessages = async () => {
    const { data } = await supabase.from('mensajes').select('*').eq('session_id', sessionId).order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const msg = input.trim();
    setInput('');
    
    const { error } = await supabase.from('mensajes').insert([{
      session_id: sessionId,
      contenido: msg,
      rol: 'bot' // Enviamos como bot para que le llegue al cliente
    }]);

    if (error) {
      console.error("Error de Supabase al enviar chat:", error);
      alert(`Error al enviar mensaje: ${error.message}`);
      setInput(msg);
    }
  };

  return (
    <div className="moto-chat-widget">
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--accent-green)', color: '#fff', borderRadius: '12px 12px 0 0', flexShrink: 0 }}>
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>Chat con Cliente</h4>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}><X size={18} /></button>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.map((m, i) => (
          <div key={m.id || i} style={{ alignSelf: m.rol === 'user' ? 'flex-start' : 'flex-end', backgroundColor: m.rol === 'user' ? 'var(--bg-color)' : 'var(--accent-green-light)', padding: '8px 12px', borderRadius: '8px', maxWidth: '80%', fontSize: '14px', border: m.rol === 'user' ? '1px solid var(--border-color)' : '1px solid var(--accent-green)' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: m.rol === 'user' ? 'var(--text-muted)' : 'var(--accent-green)', display: 'block', marginBottom: '2px' }}>
              {m.rol === 'user' ? 'Cliente' : 'Tú'}
            </span>
            {m.contenido}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={sendMessage} style={{ padding: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px', flexShrink: 0 }}>
        <input 
          type="text" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder="Escribe al cliente..." 
          style={{ flex: 1, padding: '8px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', outline: 'none', fontSize: '16px' }} 
        />
        <button type="submit" style={{ backgroundColor: 'var(--accent-green)', color: '#fff', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

export default function MotoDashboard({ user }) {
  const [estado, setEstado] = useState('inactivo');
  const [reservas, setReservas] = useState([]);
  const [todasReservas, setTodasReservas] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const [hiddenPendientes, setHiddenPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChatSession, setActiveChatSession] = useState(null);
  const [showExtraService, setShowExtraService] = useState(null);
  const [showEditMainService, setShowEditMainService] = useState(null);
  const [extraServicioDesc, setExtraServicioDesc] = useState('');
  const [extraServicioMonto, setExtraServicioMonto] = useState('');
  const [serviciosCatalogo, setServiciosCatalogo] = useState([]);
  
  // Historial State
  const [historialSearch, setHistorialSearch] = useState('');
  const [historialStatus, setHistorialStatus] = useState('Todos');

  // Liquidación State
  const [liquidacionData, setLiquidacionData] = useState({
    totalComisiones: 0,
    totalAnticipos: 0,
    saldoDisponible: 0,
    comisionesList: [],
    anticiposList: []
  });
  const [showLiquidacionDetalle, setShowLiquidacionDetalle] = useState(false);

  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedReservaForPayment, setSelectedReservaForPayment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(''); // 'QR' or 'EFECTIVO'
  const [montoRecibido, setMontoRecibido] = useState('');
  const [qrUrl, setQrUrl] = useState('');

  const getTelefono = (input) => {
    if (!input) return '';
    let text = typeof input === 'object' 
      ? (input.cliente_telefono || input.telefono || input.cliente_nombre || input.cliente || '') 
      : String(input);
    if (!text) return '';
    const match = text.match(/Tel:\s*([\d\+\-\s]+)/i);
    if (match) return match[1].trim();
    if (text.includes(' - Tel: ')) return text.split(' - Tel: ')[1].trim();
    const digits = text.replace(/\D/g, '');
    if (digits.length >= 7) return digits;
    return '';
  };

  useEffect(() => {
    if (user) {
      fetchTrabajadorEstado();
      fetchReservasAsignadas();
      fetchLiquidacionData();
      fetchServiciosCatalogo();
      
      // Suscribirse a cambios en reservas para esta moto
      const channel = supabase
        .channel('reservas_moto')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, payload => {
          fetchReservasAsignadas();
          fetchLiquidacionData();
          
          if (payload.eventType === 'INSERT') {
            if (payload.new.trabajador_id === user.id || payload.new.estado_reserva === 'pendiente') {
              playMobileAlert();
              if(window.Notification && Notification.permission === "granted") {
                new Notification("¡Nuevo Lavado Disponible!", { body: "Revisa tu panel de trabajos." });
              }
            }
          } else if (payload.eventType === 'UPDATE' && payload.new.estado_reserva === 'asignado' && payload.new.trabajador_id === user.id) {
            // Notificar al trabajador si se le reasigna un trabajo
            playMobileAlert();
            if(window.Notification && Notification.permission === "granted") {
              new Notification("¡Nuevo Lavado Asignado!", { body: "Revisa tu panel de trabajos." });
            }
          }
        })
        .subscribe();

      // Suscribirse a cambios en comisiones y anticipos para actualizar la liquidación en tiempo real
      const liqChannel = supabase
        .channel(`liq_${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comisiones', filter: `trabajador_id=eq.${user.id}` }, () => {
          fetchLiquidacionData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'anticipos', filter: `trabajador_id=eq.${user.id}` }, () => {
          fetchLiquidacionData();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(liqChannel);
      }
    }
  }, [user]);

  useEffect(() => {
    let watchId;
    let lastUpdate = 0; // Throttle timestamp para GPS

    if (user && estado !== 'inactivo' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const now = Date.now();
          if (now - lastUpdate < 15000) return; // Limitar updates a 1 cada 15 seg
          lastUpdate = now;

          const { latitude, longitude } = position.coords;
          try {
            await supabase.from('trabajadores').update({
              latitud: latitude,
              longitud: longitude,
              ultima_actualizacion_gps: new Date().toISOString()
            }).eq('id', user.id);
          } catch(e) {}
        },
        (error) => {
          console.warn("Error GPS (intentando recuperar):", error.message);
          // Si el usuario denegó, podríamos lanzar una alerta, de lo contrario el navegador seguirá intentando
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [estado, user]);

  const fetchTrabajadorEstado = async () => {
    const { data } = await supabase.from('trabajadores').select('estado_disponibilidad').eq('id', user.id).single();
    if (data) {
      setEstado(data.estado_disponibilidad || 'inactivo');
    }
  };

  const fetchReservasAsignadas = async () => {
    const { data } = await supabase
      .from('reservas')
      .select('*')
      .eq('trabajador_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) {
      setTodasReservas(data);
      setReservas(data.filter(r => r.estado_reserva === 'asignado' || r.estado_reserva === 'en_camino' || r.estado_reserva === 'en_proceso'));
    }
    
    // Fetch pending services available to claim
    const { data: pendingData } = await supabase
      .from('reservas')
      .select('*')
      .eq('estado_reserva', 'pendiente')
      .is('trabajador_id', null)
      .order('created_at', { ascending: false });
      
    if (pendingData) {
      setPendientes(pendingData);
    }
    
    
    setLoading(false);
  };

  const fetchServiciosCatalogo = async () => {
    const { data } = await supabase.from('servicios').select('*').eq('disponible', true).order('precio', { ascending: true });
    if (data) setServiciosCatalogo(data);
  };

  const fetchLiquidacionData = async () => {
    if (!user?.id) return;

    try {
      // 1. Obtener comisiones pendientes (solo pertenecientes a reservas vigentes)
      const { data: comisionesData } = await supabase
        .from('comisiones')
        .select('*')
        .eq('trabajador_id', user.id)
        .eq('estado', 'pendiente')
        .not('reserva_id', 'is', null)
        .order('created_at', { ascending: false });

      // 2. Obtener anticipos pendientes
      const { data: anticiposData } = await supabase
        .from('anticipos')
        .select('*')
        .eq('trabajador_id', user.id)
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: false });

      let comisionesList = comisionesData || [];
      let anticiposList = anticiposData || [];

      // Si no hay filas registradas en 'comisiones', estimamos a partir de reservas completadas
      if (comisionesList.length === 0) {
        const { data: resCompletadas } = await supabase
          .from('reservas')
          .select('*')
          .eq('trabajador_id', user.id)
          .eq('estado_reserva', 'completado');

        if (resCompletadas && resCompletadas.length > 0) {
          comisionesList = resCompletadas.map(r => {
            const precio = Number(r.precio_total || r.precio || 0);
            return {
              id: r.id,
              created_at: r.created_at || r.fecha_reserva,
              servicio_nombre: r.servicio || 'Servicio de Lavado',
              tipo: 'Lavado',
              precio: precio,
              monto_comision: precio * 0.5
            };
          });
        }
      }

      const totalComisiones = comisionesList.reduce((sum, c) => sum + Number(c.monto_comision || 0), 0);
      const totalAnticipos = anticiposList.reduce((sum, a) => sum + Number(a.monto || 0), 0);
      const saldoDisponible = Math.max(0, totalComisiones - totalAnticipos);

      setLiquidacionData({
        totalComisiones,
        totalAnticipos,
        saldoDisponible,
        comisionesList,
        anticiposList
      });
    } catch (err) {
      console.error("Error al obtener datos de liquidación:", err);
    }
  };

  const kpis = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayReservas = todasReservas.filter(r => String(r.fecha_reserva || r.created_at || '').split('T')[0] === today);
    const thisMonth = new Date().toISOString().substring(0, 7);
    const monthReservas = todasReservas.filter(r => (r.fecha_reserva || r.created_at)?.startsWith(thisMonth));
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekReservas = todasReservas.filter(r => {
      const d = new Date(r.fecha_reserva || r.created_at);
      return d >= oneWeekAgo && d <= now;
    });

    const sumIngresos = (arr) => arr.filter(r => r.estado !== 'Cancelado').reduce((sum, r) => sum + (r.precio_total || r.precio || 0), 0);
    const completedReservas = todasReservas.filter(r => r.estado_reserva === 'completado');

    const uniqueClients = new Set(completedReservas.map(r => r.cliente_nombre).filter(Boolean)).size;

    const totalExtras = completedReservas.reduce((sum, r) => {
      const parts = (r.servicio || '').split('+');
      return sum + (parts.length > 1 ? parts.length - 1 : 0);
    }, 0);
    
    const currentDayOfMonth = now.getDate();
    const ingresosMesVal = sumIngresos(monthReservas);
    const promedioDiario = currentDayOfMonth > 0 ? (ingresosMesVal / currentDayOfMonth).toFixed(2) : 0;

    return {
      ingresosDia: sumIngresos(todayReservas),
      ingresosSemana: sumIngresos(weekReservas),
      ingresosMes: ingresosMesVal,
      serviciosHoy: todayReservas.filter(r => r.estado_reserva === 'completado').length,
      serviciosMes: monthReservas.filter(r => r.estado_reserva === 'completado').length,
      promedioDiario: Number(promedioDiario),
      clientesAtendidos: uniqueClients,
      totalExtras: totalExtras
    };
  }, [todasReservas]);

  const changeEstado = async (nuevoEstado) => {
    setEstado(nuevoEstado);
    await supabase.from('trabajadores').update({ estado_disponibilidad: nuevoEstado }).eq('id', user.id);
    
    // Forzar petición de permisos de GPS activamente tras la interacción del usuario
    if (nuevoEstado !== 'inactivo' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
           // Actualizamos de inmediato la base de datos con esta primera lectura
           supabase.from('trabajadores').update({
             latitud: position.coords.latitude,
             longitud: position.coords.longitude,
             ultima_actualizacion_gps: new Date().toISOString()
           }).eq('id', user.id).then();
        },
        (err) => {
           alert("GPS Bloqueado. Por favor, ve a la configuración de tu navegador y permite la ubicación para esta app.");
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    }
  };

  const aceptarReserva = async (id) => {
    await supabase.from('reservas').update({ estado_reserva: 'en_camino' }).eq('id', id);
    setEstado('ocupado');
    await supabase.from('trabajadores').update({ estado_disponibilidad: 'ocupado' }).eq('id', user.id);
    fetchReservasAsignadas();
  };
  
  const llegueAlLugar = async (id) => {
    await supabase.from('reservas').update({ estado_reserva: 'en_proceso' }).eq('id', id);
    setEstado('en_proceso');
    await supabase.from('trabajadores').update({ estado_disponibilidad: 'en_proceso' }).eq('id', user.id);
    fetchReservasAsignadas();
  };

  const handleOpenPayment = async (res) => {
    setSelectedReservaForPayment(res);
    setPaymentModalOpen(true);
    setPaymentMethod('');
    setMontoRecibido('');
    
    // Fetch QR
    const { data } = await supabase.from('configuraciones_pago').select('qr_image_url').limit(1).single();
    if (data) setQrUrl(data.qr_image_url);
  };

  const confirmarPago = async () => {
    if (!paymentMethod) {
      alert("Debes seleccionar un método de pago.");
      return;
    }

    const total = selectedReservaForPayment.precio_total || selectedReservaForPayment.precio || 0;

    if (paymentMethod === 'EFECTIVO') {
      if (!montoRecibido || Number(montoRecibido) < total) {
        alert("El monto recibido debe ser mayor o igual al total del servicio.");
        return;
      }
    }

    const updates = {
      estado_reserva: 'completado',
      payment_method: paymentMethod,
      payment_status: 'PAGADO',
      payment_date: new Date().toISOString(),
      payment_by: user.id
    };

    if (paymentMethod === 'EFECTIVO') {
      updates.monto_recibido = Number(montoRecibido);
      updates.cambio_devuelto = Number(montoRecibido) - total;
    }

    await supabase.from('reservas').update(updates).eq('id', selectedReservaForPayment.id);
    
    setEstado('disponible');
    await supabase.from('trabajadores').update({ estado_disponibilidad: 'disponible' }).eq('id', user.id);
    
    setPaymentModalOpen(false);
    setSelectedReservaForPayment(null);
    fetchReservasAsignadas();
  };

  const rechazarReserva = async (id) => {
    try {
      // Marcar como pendiente para que otros puedan tomarlo
      await supabase.from('reservas').update({ trabajador_id: null, estado_reserva: 'pendiente' }).eq('id', id);
    } catch(err) {
      console.error(err);
    }
    fetchReservasAsignadas();
  };

  const reclamarReserva = async (id) => {
    await supabase.from('reservas').update({ 
      trabajador_id: user.id, 
      estado_reserva: 'asignado' 
    }).eq('id', id);
    fetchReservasAsignadas();
  };

  const handleAddExtra = async (e, resId) => {
    e.preventDefault();
    if(!extraServicioDesc || !extraServicioMonto) return;
    const reserva = reservas.find(r => r.id === resId);
    if(!reserva) return;
    
    const nuevoServicioStr = reserva.servicio ? `${reserva.servicio} + ${extraServicioDesc}` : extraServicioDesc;
    const nuevoPrecio = Number(reserva.precio_total || reserva.precio || 0) + Number(extraServicioMonto);
    
    const { error } = await supabase.from('reservas').update({
      servicio: nuevoServicioStr,
      precio_total: nuevoPrecio
    }).eq('id', resId);
    
    if (error) {
      console.error("Error updating reserva:", error);
      alert("Hubo un error al guardar el extra. Intenta de nuevo.");
      return;
    }
    
    setShowExtraService(null);
    setExtraServicioDesc('');
    setExtraServicioMonto('');
    fetchReservasAsignadas();
  };

  const handleUpdateMainService = async (resId, newService) => {
    const reserva = reservas.find(r => r.id === resId);
    if (!reserva) return;

    let oldServiceName = "";
    let precioAnterior = 0;

    if (reserva.servicio_id) {
      const oldS = serviciosCatalogo.find(s => s.id === reserva.servicio_id);
      if (oldS) {
        oldServiceName = oldS.nombre;
        precioAnterior = Number(oldS.precio);
      }
    }

    if (!oldServiceName && Array.isArray(reserva.servicios_detalle) && reserva.servicios_detalle.length > 0) {
      oldServiceName = reserva.servicios_detalle[0].nombre;
      precioAnterior = Number(reserva.servicios_detalle[0].precio);
    }

    let nuevoServicioStr = newService.nombre;
    if (oldServiceName && reserva.servicio && reserva.servicio.includes(oldServiceName)) {
      nuevoServicioStr = reserva.servicio.replace(oldServiceName, newService.nombre);
    } else {
      nuevoServicioStr = newService.nombre; 
    }

    let nuevoPrecio = Number(newService.precio);
    let updatedDetalles = reserva.servicios_detalle;

    if (Array.isArray(updatedDetalles) && updatedDetalles.length > 0) {
      updatedDetalles = [
        { id: newService.id, nombre: newService.nombre, categoria: newService.categoria, precio: Number(newService.precio) },
        ...updatedDetalles.slice(1)
      ];
      nuevoPrecio = updatedDetalles.reduce((sum, item) => sum + Number(item.precio), 0);
    } else {
      const montoExtras = Math.max(0, Number(reserva.precio_total || reserva.precio || 0) - precioAnterior);
      nuevoPrecio = Number(newService.precio) + montoExtras;
    }

    const updates = {
      servicio: nuevoServicioStr,
      servicio_id: newService.id,
      precio_total: nuevoPrecio
    };
    if (Array.isArray(updatedDetalles)) {
      updates.servicios_detalle = updatedDetalles;
    }

    const { error } = await supabase.from('reservas').update(updates).eq('id', resId);

    if (error) {
      console.error("Error updating main service:", error);
      alert("Hubo un error al cambiar el servicio. Intenta de nuevo.");
      return;
    }

    setShowEditMainService(null);
    fetchReservasAsignadas();
  };

  const playMobileAlert = () => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 400]); // Patrón de vibración doble
      }
      // Un tono de notificación elegante y claro
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 1.0;
      audio.play().catch(e => console.log("Audio autoplay bloqueado por el navegador", e));
    } catch (e) {
      console.log("No se pudo emitir la alerta móvil", e);
    }
  };

  const requestNotifPermission = () => {
    playMobileAlert(); // Probar sonido y vibración inmediatamente
    
    // Primero, solicitar permiso a través de OneSignal para asegurar la recepción Push
    if (OneSignal.Notifications) {
      OneSignal.Notifications.requestPermission().then(permission => {
         if(permission) {
             console.log("OneSignal Permission Granted");
         }
      });
    }

    if (window.Notification) {
      if (Notification.permission !== "granted") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
             if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(registration => {
                  registration.showNotification("¡Notificaciones activadas!", { body: "Ahora recibirás avisos de nuevos lavados.", icon: '/logo.png' });
                });
             } else {
                new Notification("¡Notificaciones activadas!", { body: "Ahora recibirás avisos de nuevos lavados.", icon: '/logo.png' });
             }
          } else {
            alert("Permiso denegado por el navegador. Pero sí escucharás la campana y la vibración.");
          }
        });
      } else {
         if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
              registration.showNotification("Las notificaciones ya están activas", { body: "Todo listo para recibir nuevos lavados.", icon: '/logo.png' });
            });
         } else {
            new Notification("Las notificaciones ya están activas", { body: "Todo listo para recibir nuevos lavados.", icon: '/logo.png' });
         }
      }
    } else {
      alert("Tu navegador no soporta notificaciones web. Pero sí escucharás la campana y la vibración.");
    }
  };

  const requestGpsPermission = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta GPS.");
      return;
    }
    
    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          alert("¡GPS Activado correctamente!");
          supabase.from('trabajadores').update({
            latitud: position.coords.latitude,
            longitud: position.coords.longitude,
            ultima_actualizacion_gps: new Date().toISOString()
          }).eq('id', user.id).then();
        },
        (error) => {
          console.error("Error pidiendo GPS:", error);
          if (error.code === error.PERMISSION_DENIED) {
            alert("Permiso de GPS DENEGADO. Debes ir a la configuración de tu navegador, borrar los permisos y permitir la ubicación para esta app.");
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            alert("La ubicación no está disponible en este momento. Intenta al aire libre.");
          } else if (error.code === error.TIMEOUT) {
            alert("Se agotó el tiempo esperando el GPS. Intenta de nuevo.");
          } else {
            alert("Error desconocido al intentar obtener el GPS: " + error.message);
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } catch(err) {
      alert("Ocurrió un error al solicitar el GPS: " + err.message);
  };

  const sortedServicios = [...serviciosCatalogo].sort((a, b) => {
    const catA = String(a.categoria || a.nombre).toLowerCase();
    const catB = String(b.categoria || b.nombre).toLowerCase();
    
    const isAClasico = catA.includes('clásico') || catA.includes('clasico');
    const isBClasico = catB.includes('clásico') || catB.includes('clasico');
    const isAPremium = catA.includes('premium');
    const isBPremium = catB.includes('premium');
    
    if (isAClasico && !isBClasico) return -1;
    if (!isAClasico && isBClasico) return 1;
    
    if (isAPremium && !isBPremium) return -1;
    if (!isAPremium && isBPremium) return 1;
    
    return Number(a.precio) - Number(b.precio);
  });

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="text-h1">Mi Panel de Trabajo</h1>
          <p className="text-muted" style={{ marginTop: '4px' }}>Hola, {user?.nombre}. Gestiona tus lavados.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={requestGpsPermission} style={{ background: 'none', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '13px' }}>
            <MapPin size={16} /> Activar GPS
          </button>
          <button onClick={requestNotifPermission} style={{ background: 'none', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '13px' }}>
            <Bell size={16} /> Activar Notificaciones
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-h2" style={{ marginBottom: '16px' }}>Tus Estadísticas Personales</h2>
        <div className="kpi-container">
          <div className="kpi-card">
            <div className="kpi-label">Ingresos Hoy</div>
            <div className="kpi-value">Bs {kpis.ingresosDia}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Ingresos Semana</div>
            <div className="kpi-value">Bs {kpis.ingresosSemana}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Ingresos Mes</div>
            <div className="kpi-value">Bs {kpis.ingresosMes}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Promedio Diario</div>
            <div className="kpi-value">Bs {kpis.promedioDiario}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Servicios Hoy</div>
            <div className="kpi-value">{kpis.serviciosHoy}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Servicios Mes</div>
            <div className="kpi-value">{kpis.serviciosMes}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Clientes Atendidos</div>
            <div className="kpi-value">{kpis.clientesAtendidos}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Extras Vendidos</div>
            <div className="kpi-value">{kpis.totalExtras}</div>
          </div>
        </div>
      </div>

      {/* Sección: Saldo de Liquidación del Trabajador */}
      <div style={{
        backgroundColor: 'var(--card-bg)',
        padding: '20px 24px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(28, 169, 201, 0.04) 100%)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)' }}>Tu Saldo de Liquidación</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Monto disponible para cobrar o solicitar como adelanto</p>
            </div>
          </div>

          <button 
            onClick={() => setShowLiquidacionDetalle(!showLiquidacionDetalle)} 
            style={{
              backgroundColor: 'var(--bg-color)',
              color: 'var(--accent-cyan)',
              border: '1px solid var(--border-color)',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Eye size={16} /> {showLiquidacionDetalle ? 'Ocultar Desglose' : 'Ver Desglose'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {/* Card Principal: Saldo Disponible */}
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Saldo Disponible para Retiro
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981', marginTop: '6px' }}>
              Bs {liquidacionData.saldoDisponible}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Puedes solicitar de liquidación/adelanto hasta: <strong style={{ color: '#10b981' }}>Bs {liquidacionData.saldoDisponible}</strong>
            </div>
          </div>

          {/* Card Secundario 1: Comisiones Acumuladas */}
          <div style={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Comisiones Ganadas (Pendientes)
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-main)', marginTop: '6px' }}>
              Bs {liquidacionData.totalComisiones}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Total de {liquidacionData.comisionesList.length} servicio(s) acumulado(s)
            </div>
          </div>

          {/* Card Secundario 2: Adelantos Recibidos */}
          <div style={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: liquidacionData.totalAnticipos > 0 ? '#ef4444' : 'var(--text-muted)', textTransform: 'uppercase' }}>
              Adelantos / Anticipos Recibidos
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: liquidacionData.totalAnticipos > 0 ? '#ef4444' : 'var(--text-main)', marginTop: '6px' }}>
              - Bs {liquidacionData.totalAnticipos}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {liquidacionData.anticiposList.length} adelanto(s) descontado(s)
            </div>
          </div>
        </div>

        {/* Desglose desplegable de comisiones y anticipos */}
        {showLiquidacionDetalle && (
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed var(--border-color)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>Detalle de Comisiones y Adelantos</h4>
            
            {/* Tabla de Comisiones */}
            <div style={{ marginBottom: '16px' }}>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#10b981' }}>Comisiones acumuladas</h5>
              {liquidacionData.comisionesList.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No tienes comisiones pendientes de cobro.</p>
              ) : (
                <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'var(--bg-color)' }}>
                      <tr>
                        <th style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Fecha</th>
                        <th style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Servicio</th>
                        <th style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Tipo</th>
                        <th style={{ padding: '8px 12px', color: 'var(--text-muted)', textAlign: 'right' }}>Cobrado</th>
                        <th style={{ padding: '8px 12px', color: 'var(--text-muted)', textAlign: 'right' }}>Tu Comisión</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liquidacionData.comisionesList.map((c, i) => (
                        <tr key={c.id || i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px 12px' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                          <td style={{ padding: '8px 12px', fontWeight: '500' }}>{c.servicio_nombre || 'Servicio'}</td>
                          <td style={{ padding: '8px 12px' }}>{c.tipo || 'Lavado'}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>Bs {c.precio}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', color: '#10b981' }}>+ Bs {c.monto_comision}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Tabla de Adelantos */}
            {liquidacionData.anticiposList.length > 0 && (
              <div>
                <h5 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#ef4444' }}>Adelantos Descontados</h5>
                <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'var(--bg-color)' }}>
                      <tr>
                        <th style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Fecha</th>
                        <th style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Concepto / Observación</th>
                        <th style={{ padding: '8px 12px', color: 'var(--text-muted)', textAlign: 'right' }}>Monto Descontado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liquidacionData.anticiposList.map((a, i) => (
                        <tr key={a.id || i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px 12px' }}>{new Date(a.created_at).toLocaleDateString()}</td>
                          <td style={{ padding: '8px 12px' }}>{a.observaciones || 'Adelanto de sueldo'}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', color: '#ef4444' }}>- Bs {a.monto}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ backgroundColor: 'var(--card-bg)', padding: '20px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: estado === 'disponible' ? 'rgba(16, 185, 129, 0.2)' : estado === 'en_proceso' ? 'rgba(250, 204, 21, 0.2)' : estado === 'ocupado' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={24} color={estado === 'disponible' ? '#10b981' : estado === 'en_proceso' ? '#eab308' : estado === 'ocupado' ? '#f59e0b' : '#ef4444'} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Estado Actual</h3>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', textTransform: 'capitalize' }}>{estado.replace('_', ' ')}</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select 
            value={estado}
            onChange={(e) => changeEstado(e.target.value)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              fontWeight: 'bold',
              backgroundColor: estado === 'disponible' ? '#10b981' : estado === 'en_proceso' ? '#facc15' : estado === 'ocupado' ? '#f59e0b' : '#ef4444',
              color: estado === 'en_proceso' ? '#000' : '#fff',
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              textAlign: 'center'
            }}
          >
            <option value="disponible">🟢 Disponible</option>
            <option value="ocupado">🟠 Ocupado (En camino)</option>
            <option value="en_proceso">🟡 En Proceso (Lavando)</option>
            <option value="inactivo">🔴 Inactivo / Fuera</option>
          </select>
        </div>
      </div>

      <h2 className="text-h2" style={{ marginBottom: '16px' }}>Trabajos Activos ({reservas.length})</h2>
      
      {loading ? (
        <p>Cargando trabajos...</p>
      ) : reservas.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
          <MapPin size={48} style={{ opacity: 0.2, margin: '0 auto 16px auto' }} />
          <p>No tienes ningún lavado asignado en este momento.</p>
          <p style={{ fontSize: '13px', marginTop: '8px' }}>Si estás disponible, la próxima reserva entrará automáticamente.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reservas.map(res => (
            <div key={res.id} style={{ backgroundColor: 'var(--card-bg)', padding: '20px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-soft)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0' }}>
                    {res.servicio || 'Servicio Personalizado'} <span style={{ color: '#10b981', marginLeft: '6px' }}>(Bs {res.precio_total || res.precio || 0})</span>
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}><strong>Cliente:</strong> {res.cliente_nombre ? res.cliente_nombre.split(' - Tel: ')[0] : 'No especificado'}</p>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '14px' }}><strong>Fecha:</strong> {res.fecha_reserva || 'No especificada'} | <strong>Hora:</strong> {res.hora_reserva || 'No especificada'}</p>
                </div>
                <div style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backgroundColor: res.estado_reserva === 'asignado' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: res.estado_reserva === 'asignado' ? '#3b82f6' : '#10b981' }}>
                  {res.estado_reserva === 'asignado' ? 'NUEVO ASIGNADO' : 'EN CAMINO'}
                </div>
              </div>
              
              {res.ubicacion_gps && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', padding: '16px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <MapPin size={18} color="#ef4444" />
                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Ubicación</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>{res.ubicacion_gps}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(res.ubicacion_gps)}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: 'rgba(59, 130, 246, 0.1)', fontSize: '12px', color: '#3b82f6', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Map size={14} /> Maps
                      </a>
                      <a 
                        href={`https://waze.com/ul?q=${encodeURIComponent(res.ubicacion_gps)}&navigate=yes`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.1)', fontSize: '12px', color: '#10b981', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        Waze
                      </a>
                    </div>
                  </div>
                  
                  <div style={{ width: '100%', height: '150px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <iframe 
                      width="100%" 
                      height="100%" 
                      frameBorder="0" 
                      style={{ border: 0 }}
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(res.ubicacion_gps)}&hl=es&z=15&output=embed`}
                      allowFullScreen>
                    </iframe>
                  </div>
                </div>
              )}
              
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {res.estado_reserva === 'asignado' ? (
                  <>
                    <button onClick={() => aceptarReserva(res.id)} style={{ flex: 1, minWidth: '140px', padding: '12px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                      <Check size={18} /> Voy en Camino
                    </button>
                    <button onClick={() => rechazarReserva(res.id)} style={{ padding: '12px 16px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                      <X size={18} /> Rechazar
                    </button>
                  </>
                ) : res.estado_reserva === 'en_camino' ? (
                  <button onClick={() => llegueAlLugar(res.id)} style={{ flex: 1, minWidth: '140px', padding: '12px 16px', backgroundColor: '#facc15', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                    <MapPin size={18} /> Llegué al Lugar
                  </button>
                ) : (
                  <button onClick={() => handleOpenPayment(res)} style={{ flex: 1, minWidth: '140px', padding: '12px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                    <Check size={18} /> Marcar Lavado Terminado
                  </button>
                )}
                
                
                <button onClick={() => setActiveChatSession(res.chat_session_id || `fallback_${res.id}`)} style={{ flex: 1, minWidth: '140px', padding: '12px 16px', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                  <MessageSquare size={18} /> Chat (Web)
                </button>
                
                <button onClick={() => { setShowExtraService(showExtraService === res.id ? null : res.id); setShowEditMainService(null); }} style={{ flex: 1, minWidth: '140px', padding: '12px 16px', backgroundColor: 'transparent', color: '#8b5cf6', border: '1px solid #8b5cf6', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                  <PlusCircle size={18} /> Agregar Extra
                </button>

                <button onClick={() => { setShowEditMainService(showEditMainService === res.id ? null : res.id); setShowExtraService(null); }} style={{ flex: 1, minWidth: '140px', padding: '12px 16px', backgroundColor: 'transparent', color: '#f59e0b', border: '1px solid #f59e0b', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                  <Edit3 size={18} /> Editar Servicio
                </button>
              </div>

              {showEditMainService === res.id && (
                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px dashed #f59e0b' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Edit3 size={16} /> Cambiar Servicio Principal
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', marginTop: 0 }}>
                    Selecciona el servicio correcto según el vehículo. Los extras se mantendrán.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {sortedServicios.length > 0 && sortedServicios.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleUpdateMainService(res.id, s)}
                        style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', borderRadius: '16px', border: '1px solid #f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', cursor: 'pointer', transition: 'all 0.2s' }}
                      >
                        {s.nombre} (Bs {s.precio})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showExtraService === res.id && (
                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px dashed #8b5cf6' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <PlusCircle size={16} /> Agregar Servicio o Cobro Extra
                  </h4>
                  <form onSubmit={(e) => handleAddExtra(e, res.id)} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    {sortedServicios.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
                        {sortedServicios.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => { setExtraServicioDesc(s.nombre); setExtraServicioMonto(s.precio); }}
                            style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', borderRadius: '16px', border: '1px solid #8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', cursor: 'pointer', transition: 'all 0.2s' }}
                          >
                            + {s.nombre} (Bs {s.precio})
                          </button>
                        ))}
                      </div>
                    )}

                    <input
                      type="text"
                      placeholder="Descripción (ej. Encerado extra)"
                      value={extraServicioDesc}
                      onChange={e => setExtraServicioDesc(e.target.value)}
                      required
                      style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '14px' }}
                    />
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <input
                        type="number"
                        placeholder="Monto (Bs)"
                        value={extraServicioMonto}
                        onChange={e => setExtraServicioMonto(e.target.value)}
                        required
                        min="1"
                        style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '14px' }}
                      />
                      <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Guardar
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {pendientes.filter(res => !hiddenPendientes.includes(res.id)).length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h2 className="text-h2" style={{ marginBottom: '16px', color: '#f59e0b' }}>Servicios Pendientes por Asignar ({pendientes.filter(res => !hiddenPendientes.includes(res.id)).length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pendientes.filter(res => !hiddenPendientes.includes(res.id)).map(res => (
              <div key={res.id} style={{ backgroundColor: 'var(--card-bg)', padding: '20px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-soft)', border: '1px dashed #f59e0b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{res.servicio}</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}><strong>Cliente:</strong> {res.cliente_nombre ? res.cliente_nombre.split(' - Tel: ')[0] : 'No especificado'}</p>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '14px' }}><strong>Fecha:</strong> {res.fecha_reserva || 'No especificada'} | <strong>Hora:</strong> {res.hora_reserva || res.hora || 'No especificada'}</p>
                  </div>
                  <div style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                    PENDIENTE
                  </div>
                </div>

                {res.ubicacion_gps && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <MapPin size={18} color="#ef4444" />
                      <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Ubicación</span>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(res.ubicacion_gps)}`} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: 'rgba(59, 130, 246, 0.1)', fontSize: '12px', color: '#3b82f6', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Map size={14} /> Maps
                        </a>
                      </div>
                    </div>
                    <div style={{ width: '100%', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <iframe 
                        width="100%" 
                        height="100%" 
                        frameBorder="0" 
                        style={{ border: 0 }}
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(res.ubicacion_gps)}&hl=es&z=15&output=embed`}
                        allowFullScreen>
                      </iframe>
                    </div>
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => reclamarReserva(res.id)} style={{ flex: 1, padding: '12px', backgroundColor: '#f59e0b', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                    <Check size={18} /> Tomar Servicio
                  </button>
                  <button onClick={() => setHiddenPendientes(prev => [...prev, res.id])} style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                    <X size={18} /> Dejar para otro
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {activeChatSession && (
        <MotoChat sessionId={activeChatSession} onClose={() => setActiveChatSession(null)} />
      )}

      {/* Payment Modal */}
      {paymentModalOpen && selectedReservaForPayment && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', width: '100%', maxWidth: '400px', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-color)' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Banknote size={20} color="#10b981" /> Método de Pago
              </h3>
            </div>
            
            <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
              <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                Selecciona cómo pagó el cliente el servicio de <strong>Bs {selectedReservaForPayment.precio_total || selectedReservaForPayment.precio || 0}</strong>.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <button 
                  onClick={() => setPaymentMethod('QR')}
                  style={{ padding: '16px', borderRadius: '12px', border: paymentMethod === 'QR' ? '2px solid #3b82f6' : '1px solid var(--border-color)', backgroundColor: paymentMethod === 'QR' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-color)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: paymentMethod === 'QR' ? '#3b82f6' : 'var(--text-main)', transition: 'all 0.2s' }}
                >
                  <MapPin size={24} /> 
                  <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Pago por QR</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('EFECTIVO')}
                  style={{ padding: '16px', borderRadius: '12px', border: paymentMethod === 'EFECTIVO' ? '2px solid #10b981' : '1px solid var(--border-color)', backgroundColor: paymentMethod === 'EFECTIVO' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-color)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: paymentMethod === 'EFECTIVO' ? '#10b981' : 'var(--text-main)', transition: 'all 0.2s' }}
                >
                  <Banknote size={24} />
                  <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Efectivo</span>
                </button>
              </div>

              {paymentMethod === 'QR' && (
                <div style={{ textAlign: 'center', animation: 'fadeIn 0.3s ease-out' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '12px' }}>Escanea este código</p>
                  <div style={{ width: '200px', height: '200px', margin: '0 auto', backgroundColor: '#fff', padding: '8px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    {qrUrl ? (
                      <img src={qrUrl} alt="QR de Pago" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Cargando QR...</div>
                    )}
                  </div>
                </div>
              )}

              {paymentMethod === 'EFECTIVO' && (
                <div style={{ animation: 'fadeIn 0.3s ease-out', backgroundColor: 'var(--bg-color)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total del servicio:</span>
                    <span style={{ fontWeight: 'bold' }}>Bs {selectedReservaForPayment.precio_total || selectedReservaForPayment.precio || 0}</span>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-main)' }}>Monto recibido:</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold', color: 'var(--text-muted)' }}>Bs</span>
                      <input 
                        type="number" 
                        value={montoRecibido}
                        onChange={(e) => setMontoRecibido(e.target.value)}
                        placeholder="Ej. 50"
                        style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '16px', fontWeight: 'bold', outline: 'none' }}
                      />
                    </div>
                  </div>

                  {montoRecibido && Number(montoRecibido) >= (selectedReservaForPayment.precio_total || selectedReservaForPayment.precio || 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px dashed #10b981' }}>
                      <span style={{ fontWeight: 'bold', color: '#10b981' }}>Cambio a devolver:</span>
                      <span style={{ fontWeight: 'bold', color: '#10b981', fontSize: '16px' }}>Bs {Number(montoRecibido) - (selectedReservaForPayment.precio_total || selectedReservaForPayment.precio || 0)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px', backgroundColor: 'var(--bg-color)' }}>
              <button 
                onClick={() => setPaymentModalOpen(false)}
                style={{ flex: 1, padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-main)', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarPago}
                disabled={!paymentMethod || (paymentMethod === 'EFECTIVO' && (!montoRecibido || Number(montoRecibido) < (selectedReservaForPayment.precio_total || selectedReservaForPayment.precio || 0)))}
                style={{ flex: 2, padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', cursor: (!paymentMethod || (paymentMethod === 'EFECTIVO' && (!montoRecibido || Number(montoRecibido) < (selectedReservaForPayment.precio_total || selectedReservaForPayment.precio || 0)))) ? 'not-allowed' : 'pointer', opacity: (!paymentMethod || (paymentMethod === 'EFECTIVO' && (!montoRecibido || Number(montoRecibido) < (selectedReservaForPayment.precio_total || selectedReservaForPayment.precio || 0)))) ? 0.5 : 1 }}
              >
                {paymentMethod === 'QR' ? 'Confirmar Pago QR' : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div style={{ marginTop: '48px' }}>
        <h2 className="text-h2" style={{ marginBottom: '16px' }}>Mis Servicios Realizados (Historial)</h2>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <input 
            type="text"
            placeholder="Buscar por cliente, teléfono o placa..."
            value={historialSearch}
            onChange={(e) => setHistorialSearch(e.target.value)}
            style={{ flex: 1, minWidth: '250px', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', color: 'var(--text-main)' }}
          />
          <select
            value={historialStatus}
            onChange={(e) => setHistorialStatus(e.target.value)}
            style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', minWidth: '150px' }}
          >
            <option value="Todos">Todos los Estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_proceso">En Proceso</option>
            <option value="completado">Finalizado</option>
            <option value="Cancelado">Cancelado</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {todasReservas
            .filter(res => {
              if (historialStatus !== 'Todos') {
                const s = res.estado_reserva || res.estado;
                if (historialStatus === 'Cancelado' && res.estado !== 'Cancelado') return false;
                if (historialStatus !== 'Cancelado' && s !== historialStatus) return false;
              }
              if (historialSearch) {
                const search = historialSearch.toLowerCase();
                const cliente = (res.cliente_nombre || '').toLowerCase();
                const vehiculo = (res.vehiculo || '').toLowerCase();
                if (!cliente.includes(search) && !vehiculo.includes(search)) return false;
              }
              return true;
            })
            .map(res => (
              <div key={res.id} style={{ backgroundColor: 'var(--card-bg)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div><strong style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Cliente</strong><br/>{res.cliente_nombre ? res.cliente_nombre.split(' - Tel: ')[0] : ''}</div>
                  <div><strong style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Vehículo</strong><br/>{res.vehiculo}</div>
                  <div><strong style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Servicio</strong><br/>{res.servicio}</div>
                  <div><strong style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Total Generado</strong><br/>Bs {res.precio_total || res.precio || 0}</div>
                  <div><strong style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Fecha/Hora</strong><br/>{res.fecha_reserva} {res.hora_reserva}</div>
                  <div><strong style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Estado</strong><br/><span style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: 'bold' }}>{res.estado === 'Cancelado' ? 'CANCELADO' : res.estado_reserva?.replace('_', ' ')}</span></div>
                  {res.payment_method && (
                    <div><strong style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Método de Pago</strong><br/>{res.payment_method}</div>
                  )}
                  {res.observaciones && (
                    <div><strong style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Observaciones</strong><br/>{res.observaciones}</div>
                  )}
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

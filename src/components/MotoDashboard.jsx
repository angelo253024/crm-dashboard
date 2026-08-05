import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { MapPin, Check, X, Bell, User, Banknote, MessageSquare, Send, Map } from 'lucide-react';
import KpiCards from './KpiCards';

// --- Inline Chat Component for Worker ---
function MotoChat({ sessionId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    fetchMessages();
    const channel = supabase
      .channel(`chat_${sessionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `session_id=eq.${sessionId}` }, payload => {
        setMessages(prev => {
          if (prev.some(m => m.id === payload.new.id || (m.tempId && m.contenido === payload.new.contenido))) {
            return prev.map(m => (m.tempId && m.contenido === payload.new.contenido) ? payload.new : m);
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
    
    // Optimistic UI Update
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg = { tempId, session_id: sessionId, contenido: msg, rol: 'bot', created_at: new Date().toISOString() };
    setMessages(prev => [...prev, optimisticMsg]);
    
    const { data, error } = await supabase.from('mensajes').insert([{
      session_id: sessionId,
      contenido: msg,
      rol: 'bot' // Enviamos como bot para que le llegue al cliente
    }]).select();

    if (error) {
      console.error("Error de Supabase al enviar chat:", error);
      alert(`Error al enviar mensaje: ${error.message}`);
      setMessages(prev => prev.filter(m => m.tempId !== tempId));
      setInput(msg);
    }
  };

    // Usamos un div que actúa como overlay fullscreen en móviles, o widget flotante en escritorio
    <div className="moto-chat-container" style={{ 
      position: 'fixed', 
      bottom: window.innerWidth <= 768 ? '0' : '20px', 
      right: window.innerWidth <= 768 ? '0' : '20px', 
      width: window.innerWidth <= 768 ? '100%' : '350px', 
      height: window.innerWidth <= 768 ? '100%' : '500px',
      backgroundColor: 'var(--card-bg)', 
      borderRadius: window.innerWidth <= 768 ? '0' : '12px', 
      boxShadow: '0 10px 25px rgba(0,0,0,0.5)', 
      zIndex: 99999, 
      border: window.innerWidth <= 768 ? 'none' : '1px solid var(--border-color)', 
      display: 'flex', 
      flexDirection: 'column'
    }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--accent-cyan)', color: '#000', borderRadius: window.innerWidth <= 768 ? '0' : '12px 12px 0 0' }}>
        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}><MessageSquare size={18}/> Chat con Cliente</h4>
        <button onClick={onClose} style={{ background: 'rgba(0,0,0,0.1)', border: 'none', cursor: 'pointer', color: '#000', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#0f172a' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ 
            alignSelf: m.rol === 'user' ? 'flex-start' : 'flex-end', 
            backgroundColor: m.rol === 'user' ? '#334155' : '#0ea5e9', 
            color: '#fff',
            padding: '10px 14px', 
            borderRadius: m.rol === 'user' ? '16px 16px 16px 4px' : '16px 16px 4px 16px', 
            maxWidth: '85%', 
            fontSize: '15px', 
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)' 
          }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: m.rol === 'user' ? '#94a3b8' : '#e0f2fe', display: 'block', marginBottom: '4px' }}>
              {m.rol === 'user' ? 'Cliente' : 'Tú'}
            </span>
            {m.contenido}
          </div>
        ))}
      </div>
      
      <form onSubmit={sendMessage} style={{ padding: '12px 16px', backgroundColor: 'var(--card-bg)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px', paddingBottom: window.innerWidth <= 768 ? '24px' : '12px' }}>
        <input 
          type="text" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder="Escribe un mensaje..." 
          style={{ flex: 1, padding: '12px 16px', fontSize: '15px', borderRadius: '24px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', outline: 'none' }} 
        />
        <button type="submit" style={{ backgroundColor: 'var(--accent-cyan)', color: '#000', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, boxShadow: '0 4px 10px rgba(28, 169, 201, 0.4)' }}>
          <Send size={20} style={{ marginLeft: '2px' }} />
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
  const [loading, setLoading] = useState(true);
  const [activeChatSession, setActiveChatSession] = useState(null);

  const getTelefono = (nombreStr) => {
    if (!nombreStr) return '';
    const match = nombreStr.match(/Tel:\s*([\d\+\-\s]+)/);
    return match ? match[1].trim() : '';
  };

  useEffect(() => {
    if (user) {
      fetchTrabajadorEstado();
      fetchReservasAsignadas();
      
      // Suscribirse a cambios en reservas para esta moto
      const channel = supabase
        .channel('reservas_moto')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas', filter: `trabajador_id=eq.${user.id}` }, payload => {
          fetchReservasAsignadas();
          
          if (payload.eventType === 'INSERT' || (payload.eventType === 'UPDATE' && payload.new.estado_reserva === 'asignado')) {
            // Notificar al trabajador si es un nuevo trabajo
            if(window.Notification && Notification.permission === "granted") {
              new Notification("¡Nuevo Lavado Asignado!", { body: "Revisa tu panel de trabajos." });
            }
          }
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      }
    }
  }, [user]);

  useEffect(() => {
    let watchId;
    if (user && estado !== 'inactivo' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
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
          console.error("Error GPS:", error);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
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

  const kpis = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayReservas = todasReservas.filter(r => (r.fecha_reserva || r.created_at?.split('T')[0]) === today);
    const thisMonth = new Date().toISOString().substring(0, 7);
    const monthReservas = todasReservas.filter(r => (r.fecha_reserva || r.created_at)?.startsWith(thisMonth));
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekReservas = todasReservas.filter(r => {
      const d = new Date(r.fecha_reserva || r.created_at);
      return d >= oneWeekAgo && d <= now;
    });

    const sumIngresos = (arr) => arr.filter(r => r.estado !== 'Cancelado').reduce((sum, r) => sum + (r.precio_total || r.precio || 0), 0);

    return {
      ingresosDia: sumIngresos(todayReservas),
      ingresosSemana: sumIngresos(weekReservas),
      ingresosMes: sumIngresos(monthReservas),
      serviciosHoy: todayReservas.filter(r => r.estado_reserva === 'completado').length
    };
  }, [todasReservas]);

  const changeEstado = async (nuevoEstado) => {
    setEstado(nuevoEstado);
    await supabase.from('trabajadores').update({ estado_disponibilidad: nuevoEstado }).eq('id', user.id);
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

  const completarReserva = async (id) => {
    await supabase.from('reservas').update({ estado_reserva: 'completado' }).eq('id', id);
    setEstado('disponible');
    await supabase.from('trabajadores').update({ estado_disponibilidad: 'disponible' }).eq('id', user.id);
    fetchReservasAsignadas();
  };

  const rechazarReserva = async (id) => {
    // Para rechazar, marcamos la reserva para que el Chatbot (o un Edge Function) la reasigne,
    // o simplemente buscamos la siguiente moto aquí en el cliente y la asignamos.
    
    try {
      const { data: trabajadores } = await supabase
        .from('trabajadores')
        .select('id')
        .eq('estado_disponibilidad', 'disponible')
        .eq('rol', 'Trabajador')
        .neq('id', user.id)
        .limit(1);
        
      if (trabajadores && trabajadores.length > 0) {
        // Asignar al siguiente
        await supabase.from('reservas').update({ trabajador_id: trabajadores[0].id }).eq('id', id);
      } else {
        // No hay más motos, marcar como pendiente para admin
        await supabase.from('reservas').update({ trabajador_id: null, estado_reserva: 'pendiente' }).eq('id', id);
      }
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

  // Pedir permiso para notificaciones
  const requestNotifPermission = () => {
    if (window.Notification && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="text-h1">Mi Panel de Trabajo</h1>
          <p className="text-muted" style={{ marginTop: '4px' }}>Hola, {user?.nombre}. Gestiona tus lavados.</p>
        </div>
        <button onClick={requestNotifPermission} style={{ background: 'none', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
          <Bell size={16} /> Activar Notificaciones
        </button>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h2 className="text-h2" style={{ marginBottom: '16px' }}>Tus Ingresos Generados</h2>
        <KpiCards kpis={kpis} />
      </div>

      <div style={{ backgroundColor: 'var(--card-bg)', padding: '24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--border-color)' }}>
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
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{res.servicio}</h3>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}><strong>Cliente:</strong> {res.cliente_nombre || 'No especificado'}</p>
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
                        rel="noreferrer"
                        style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: 'rgba(59, 130, 246, 0.1)', fontSize: '12px', color: '#3b82f6', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Map size={14} /> Maps
                      </a>
                      <a 
                        href={`https://waze.com/ul?q=${encodeURIComponent(res.ubicacion_gps)}&navigate=yes`} 
                        target="_blank" 
                        rel="noreferrer"
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
                    <button onClick={() => aceptarReserva(res.id)} style={{ flex: 1, padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                      <Check size={18} /> Voy en Camino
                    </button>
                    <button onClick={() => rechazarReserva(res.id)} style={{ padding: '12px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                      <X size={18} /> Rechazar
                    </button>
                  </>
                ) : res.estado_reserva === 'en_camino' ? (
                  <button onClick={() => llegueAlLugar(res.id)} style={{ flex: 1, padding: '12px', backgroundColor: '#facc15', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={18} /> Llegué al Lugar
                  </button>
                ) : (
                  <button onClick={() => completarReserva(res.id)} style={{ flex: 1, padding: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                    <Check size={18} /> Marcar Lavado Terminado
                  </button>
                )}
                
                <button onClick={() => setActiveChatSession(res.chat_session_id || `fallback_${res.id}`)} style={{ flex: 1, minWidth: '150px', padding: '12px', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={18} /> Chat (Web)
                </button>
                
                {getTelefono(res.cliente_nombre) && (
                  <a 
                    href={`https://wa.me/${getTelefono(res.cliente_nombre).replace(/\s+/g, '')}?text=Hola,%20soy%20el%20trabajador%20asignado%20para%20tu%20lavado.%20Voy%20en%20camino.`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ flex: 1, minWidth: '150px', padding: '12px', backgroundColor: '#25D366', color: 'white', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                  >
                    <MessageSquare size={18} /> WhatsApp Cliente
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {pendientes.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h2 className="text-h2" style={{ marginBottom: '16px', color: '#f59e0b' }}>Servicios Pendientes por Asignar ({pendientes.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pendientes.map(res => (
              <div key={res.id} style={{ backgroundColor: 'var(--card-bg)', padding: '20px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-soft)', border: '1px dashed #f59e0b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{res.servicio}</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}><strong>Cliente:</strong> {res.cliente_nombre || 'No especificado'}</p>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '14px' }}><strong>Hora:</strong> {res.hora_reserva || res.hora}</p>
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
                
                <button onClick={() => reclamarReserva(res.id)} style={{ width: '100%', padding: '12px', backgroundColor: '#f59e0b', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <Check size={18} /> Tomar Servicio
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {activeChatSession && (
        <MotoChat sessionId={activeChatSession} onClose={() => setActiveChatSession(null)} />
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { MapPin, Check, X, Bell, User, Banknote, MessageSquare, Send } from 'lucide-react';
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
        setMessages(prev => [...prev, payload.new]);
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
    
    await supabase.from('mensajes').insert([{
      session_id: sessionId,
      contenido: msg,
      rol: 'bot' // Enviamos como bot para que le llegue al cliente
    }]);
  };

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', width: '350px', backgroundColor: 'var(--card-bg)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 9999, border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '400px' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--accent-cyan)', color: '#000', borderRadius: '12px 12px 0 0' }}>
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>Chat con Cliente</h4>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#000' }}><X size={18} /></button>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.rol === 'user' ? 'flex-start' : 'flex-end', backgroundColor: m.rol === 'user' ? 'var(--bg-color)' : 'rgba(28, 169, 201, 0.2)', padding: '8px 12px', borderRadius: '8px', maxWidth: '80%', fontSize: '14px', border: m.rol === 'user' ? '1px solid var(--border-color)' : 'none' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: m.rol === 'user' ? 'var(--text-muted)' : 'var(--accent-cyan)', display: 'block', marginBottom: '2px' }}>
              {m.rol === 'user' ? 'Cliente' : 'Tú'}
            </span>
            {m.contenido}
          </div>
        ))}
      </div>
      
      <form onSubmit={sendMessage} style={{ padding: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px' }}>
        <input 
          type="text" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder="Escribe al cliente..." 
          style={{ flex: 1, padding: '8px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', outline: 'none' }} 
        />
        <button type="submit" style={{ backgroundColor: 'var(--accent-cyan)', color: '#000', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
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
  const [loading, setLoading] = useState(true);
  const [activeChatSession, setActiveChatSession] = useState(null);

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
      setReservas(data.filter(r => r.estado_reserva === 'asignado' || r.estado_reserva === 'en_camino'));
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

  const toggleEstado = async () => {
    const nuevoEstado = estado === 'disponible' ? 'ocupado' : 'disponible';
    setEstado(nuevoEstado);
    await supabase.from('trabajadores').update({ estado_disponibilidad: nuevoEstado }).eq('id', user.id);
  };

  const aceptarReserva = async (id) => {
    await supabase.from('reservas').update({ estado_reserva: 'en_camino' }).eq('id', id);
    // Marcar como ocupado automáticamente al aceptar un trabajo
    setEstado('ocupado');
    await supabase.from('trabajadores').update({ estado_disponibilidad: 'ocupado' }).eq('id', user.id);
    fetchReservasAsignadas();
  };

  const completarReserva = async (id) => {
    await supabase.from('reservas').update({ estado_reserva: 'completado' }).eq('id', id);
    // Volver a disponible tras completar
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
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: estado === 'disponible' ? 'rgba(16, 185, 129, 0.2)' : estado === 'ocupado' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={24} color={estado === 'disponible' ? '#10b981' : estado === 'ocupado' ? '#f59e0b' : '#ef4444'} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Estado Actual</h3>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', textTransform: 'capitalize' }}>{estado}</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)' }}>
            {estado === 'disponible' ? 'Modo Disponible Activado' : 'Estás Ocupado'}
          </span>
          <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px' }}>
            <input 
              type="checkbox" 
              checked={estado === 'disponible'} 
              onChange={toggleEstado} 
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: estado === 'disponible' ? '#10b981' : '#f59e0b',
              transition: '.4s',
              borderRadius: '34px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 5px'
            }}>
              <span style={{
                position: 'absolute',
                content: '""',
                height: '26px',
                width: '26px',
                left: estado === 'disponible' ? '30px' : '4px',
                bottom: '4px',
                backgroundColor: 'white',
                transition: '.4s',
                borderRadius: '50%'
              }}></span>
            </span>
          </label>
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
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px', padding: '12px', backgroundColor: 'var(--bg-color)', borderRadius: '6px' }}>
                  <MapPin size={18} color="#ef4444" />
                  <span style={{ fontSize: '14px', fontFamily: 'monospace' }}>Ubicación: {res.ubicacion_gps}</span>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(res.ubicacion_gps)}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--accent-cyan)', textDecoration: 'none', fontWeight: 'bold' }}
                  >
                    Abrir Mapa
                  </a>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '12px' }}>
                {res.estado_reserva === 'asignado' ? (
                  <>
                    <button onClick={() => aceptarReserva(res.id)} style={{ flex: 1, padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                      <Check size={18} /> Voy en Camino
                    </button>
                    <button onClick={() => rechazarReserva(res.id)} style={{ padding: '12px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                      <X size={18} /> Rechazar
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => completarReserva(res.id)} style={{ flex: 1, padding: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                      <Check size={18} /> Marcar Lavado Terminado
                    </button>
                    {res.chat_session_id && (
                      <button onClick={() => setActiveChatSession(res.chat_session_id)} style={{ padding: '12px', backgroundColor: 'var(--accent-cyan)', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                        <MessageSquare size={18} /> Abrir Chat Cliente
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {activeChatSession && (
        <MotoChat sessionId={activeChatSession} onClose={() => setActiveChatSession(null)} />
      )}
    </div>
  );
}

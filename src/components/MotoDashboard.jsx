import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { MapPin, Check, X, Bell, User } from 'lucide-react';

export default function MotoDashboard({ user }) {
  const [estado, setEstado] = useState('inactivo');
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);

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
      .in('estado_reserva', ['asignado', 'en_camino'])
      .order('created_at', { ascending: false });
    
    if (data) {
      setReservas(data);
    }
    setLoading(false);
  };

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
                  <button onClick={() => completarReserva(res.id)} style={{ flex: 1, padding: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                    <Check size={18} /> Marcar Lavado como Terminado
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

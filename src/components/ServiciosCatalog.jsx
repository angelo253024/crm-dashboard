import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, Droplets, CheckCircle, X, Moon, Sun, Send, MessageSquare } from 'lucide-react';
import { supabase } from '../supabase';

// --- Inline Chat Component for Client ---
function ClientChat({ sessionId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    fetchMessages();
    const channel = supabase
      .channel(`chat_${sessionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `session_id=eq.${sessionId}` }, payload => {
        setMessages(prev => {
          // Evitar duplicados si el mensaje ya está (optimistic update o ya cargado)
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
    
    // Optimistic UI Update: lo mostramos de inmediato en la UI
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg = { tempId, session_id: sessionId, contenido: msg, rol: 'user', created_at: new Date().toISOString() };
    setMessages(prev => [...prev, optimisticMsg]);
    
    const { data, error } = await supabase.from('mensajes').insert([{
      session_id: sessionId,
      contenido: msg,
      rol: 'user'
    }]).select();

    if (error) {
      console.error("Error de Supabase al enviar chat:", error);
      alert(`Error al enviar mensaje: ${error.message}. Verifica que la tabla 'mensajes' exista y tenga permisos (RLS).`);
      // Revertimos el optimistic update
      setMessages(prev => prev.filter(m => m.tempId !== tempId));
      setInput(msg); // Devolvemos el texto al input
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', width: '350px', backgroundColor: 'var(--card-bg)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 9999, border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '400px' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E4C9A', color: '#fff', borderRadius: '12px 12px 0 0' }}>
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>Chat con el Trabajador</h4>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}><X size={18} /></button>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.rol === 'bot' ? 'flex-start' : 'flex-end', backgroundColor: m.rol === 'bot' ? 'var(--bg-color)' : 'rgba(30, 76, 154, 0.2)', padding: '8px 12px', borderRadius: '8px', maxWidth: '80%', fontSize: '14px', border: m.rol === 'bot' ? '1px solid var(--border-color)' : 'none' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: m.rol === 'bot' ? 'var(--text-muted)' : '#1E4C9A', display: 'block', marginBottom: '2px' }}>
              {m.rol === 'bot' ? 'Trabajador' : 'Tú'}
            </span>
            {m.contenido}
          </div>
        ))}
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '20px' }}>
            Escribe un mensaje. El trabajador te responderá pronto.
          </div>
        )}
      </div>
      
      <form onSubmit={sendMessage} style={{ padding: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px' }}>
        <input 
          type="text" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder="Escribe un mensaje..." 
          style={{ flex: 1, padding: '8px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', outline: 'none' }} 
        />
        <button type="submit" style={{ backgroundColor: '#1E4C9A', color: '#fff', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

export default function ServiciosCatalog({ isDarkMode, toggleTheme }) {
  const [servicios, setServicios] = useState([]);
  const [categorias, setCategorias] = useState(['Todos']);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  
  // Form State
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [vehiculo, setVehiculo] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [fechaReserva, setFechaReserva] = useState('');
  const [horaReserva, setHoraReserva] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confirmedReserva, setConfirmedReserva] = useState(null);
  const [showClientChat, setShowClientChat] = useState(false);
  
  // Active reservation loaded from local storage
  const [activeReservaLocal, setActiveReservaLocal] = useState(null);

  useEffect(() => {
    fetchServicios();
    
    // Check local storage for active reservation
    const savedReserva = localStorage.getItem('active_reserva_lavamovil');
    if (savedReserva) {
      try {
        const parsed = JSON.parse(savedReserva);
        setActiveReservaLocal(parsed);
        checkReservaStatus(parsed.id);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Poll for status changes every 15 seconds if there's an active reservation
  useEffect(() => {
    let interval;
    if (activeReservaLocal) {
      interval = setInterval(() => {
        checkReservaStatus(activeReservaLocal.id);
      }, 15000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [activeReservaLocal]);

  const checkReservaStatus = async (id) => {
    const { data, error } = await supabase.from('reservas').select('*').eq('id', id).single();
    if (!error && data) {
      setActiveReservaLocal(data);
      localStorage.setItem('active_reserva_lavamovil', JSON.stringify(data));
      
      // If completed or cancelled, we might want to clear it after some time, but let's keep it simple
      if (data.estado_reserva === 'completado' || data.estado === 'Cancelado') {
        setTimeout(() => {
          localStorage.removeItem('active_reserva_lavamovil');
          setActiveReservaLocal(null);
        }, 120000); // clear after 2 minutes
      }
    }
  };

  const fetchServicios = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('servicios').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching servicios:', error);
    } else {
      setServicios(data || []);
      const cats = ['Todos', ...new Set((data || []).map(s => s.categoria).filter(Boolean))];
      setCategorias(cats);
    }
    setLoading(false);
  };

  const handleBook = (servicio) => {
    setSelectedService(servicio);
    setSuccess(false);
    setShowModal(true);
  };

  const submitReservation = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formattedHora = horaReserva.length === 5 ? `${horaReserva}:00` : horaReserva;

    // Buscar un trabajador disponible
    const { data: trabajadores } = await supabase
      .from('trabajadores')
      .select('id')
      .eq('estado_disponibilidad', 'disponible')
      .eq('rol', 'Trabajador')
      .limit(1);

    const trabajadorId = trabajadores && trabajadores.length > 0 ? trabajadores[0].id : null;
    const estadoReserva = trabajadorId ? 'asignado' : 'pendiente';
    const newChatSessionId = `chat_${Date.now()}_${Math.floor(Math.random()*1000)}`;

    const { data: insertData, error } = await supabase.from('reservas').insert([
      {
        cliente_nombre: `${clienteNombre} - Tel: ${clienteTelefono}`,
        vehiculo: vehiculo,
        ubicacion_gps: ubicacion,
        fecha_reserva: fechaReserva,
        hora_reserva: formattedHora,
        servicio_id: selectedService.id,
        precio_total: selectedService.precio,
        estado: 'Reservado',
        trabajador_id: trabajadorId,
        estado_reserva: estadoReserva,
        chat_session_id: newChatSessionId
      }
    ]).select();

    if (error) {
      console.error('Error guardando reserva:', error);
      alert('Hubo un error al procesar tu reserva: ' + (error.message || JSON.stringify(error)));
    } else {
      if (insertData && insertData.length > 0) {
        setConfirmedReserva(insertData[0]);
        setActiveReservaLocal(insertData[0]);
        localStorage.setItem('active_reserva_lavamovil', JSON.stringify(insertData[0]));
      }
      setSuccess(true);
      
      // Dispatch notification
      await supabase.from('notificaciones').insert([{
        mensaje: `Nueva reserva: ${clienteNombre} - ${selectedService.nombre}`,
        tipo: 'info'
      }]);

      setClienteNombre('');
      setClienteTelefono('');
      setVehiculo('');
      setUbicacion('');
      setFechaReserva('');
      setHoraReserva('');
    }
    setIsSubmitting(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedService(null);
    setConfirmedReserva(null);
    setShowClientChat(false);
  };

  const getGPSLocation = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }
    
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUbicacion(`${latitude}, ${longitude}`);
        setIsGettingLocation(false);
      },
      (error) => {
        console.error("Error obteniendo ubicación:", error);
        alert("No se pudo obtener tu ubicación. Por favor, asegúrate de dar permisos de ubicación al navegador o escríbela manualmente.");
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const filteredServicios = categoriaActiva === 'Todos' 
    ? servicios 
    : servicios.filter(s => s.categoria === categoriaActiva);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
      {/* Navbar Simple */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '64px' }}>
        <Link to="/" style={{ color: '#aaa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#fff'} onMouseOut={(e) => e.target.style.color = '#aaa'}>
          <ArrowLeft size={16} /> Volver
        </Link>
        
        <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src="/logo.png" 
            alt="Lavamóvil Norte" 
            style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          {/* Logo Textual Fallback */}
          <div style={{ display: 'none', alignItems: 'center', fontWeight: 900, fontSize: '20px' }}>
            <span style={{ color: 'var(--accent-dark)' }}>LAVA</span>
            <span style={{ color: 'var(--accent-green)', margin: '0 2px' }}>M</span>
            <span style={{ color: 'var(--accent-dark)' }}>ÓVIL</span>
          </div>
        </Link>
        
        <div style={{ width: '80px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={toggleTheme} className="theme-toggle-btn" aria-label="Toggle theme">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </nav>

      {/* Header del Catálogo */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <Droplets size={32} color="var(--accent-green)" />
        </div>
        <h1 style={{ fontSize: '42px', fontWeight: 900, marginBottom: '16px', letterSpacing: '-1px' }}>
          Catálogo de <span style={{ color: 'var(--accent-green)' }}>Servicios</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
          Selecciona el paquete de lavado ideal para tu vehículo. Agendaremos tu servicio a domicilio.
        </p>
      </div>

      {/* Apartado Reserva Pendiente / Activa */}
      {activeReservaLocal && (
        <div style={{ maxWidth: '800px', margin: '0 auto 48px auto', backgroundColor: 'var(--card-bg)', border: '2px solid var(--accent-green)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={24} color="var(--accent-green)" /> Mi Reserva Activa
            </h2>
            <div style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', 
              backgroundColor: 
                activeReservaLocal.estado_reserva === 'pendiente' ? 'rgba(245, 158, 11, 0.1)' : 
                activeReservaLocal.estado_reserva === 'asignado' ? 'rgba(59, 130, 246, 0.1)' :
                activeReservaLocal.estado_reserva === 'en_camino' ? 'rgba(16, 185, 129, 0.1)' :
                activeReservaLocal.estado_reserva === 'en_proceso' ? 'rgba(234, 179, 8, 0.1)' :
                activeReservaLocal.estado_reserva === 'completado' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.1)',
              color: 
                activeReservaLocal.estado_reserva === 'pendiente' ? '#f59e0b' : 
                activeReservaLocal.estado_reserva === 'asignado' ? '#3b82f6' :
                activeReservaLocal.estado_reserva === 'en_camino' ? '#10b981' :
                activeReservaLocal.estado_reserva === 'en_proceso' ? '#eab308' :
                activeReservaLocal.estado_reserva === 'completado' ? '#10b981' : '#6b7280'
            }}>
              {activeReservaLocal.estado_reserva ? activeReservaLocal.estado_reserva.replace('_', ' ').toUpperCase() : 'PENDIENTE'}
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Vehículo</p>
              <p style={{ margin: '4px 0 0 0', fontWeight: 'bold' }}>{activeReservaLocal.vehiculo}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Fecha y Hora</p>
              <p style={{ margin: '4px 0 0 0', fontWeight: 'bold' }}>{activeReservaLocal.fecha_reserva} a las {activeReservaLocal.hora_reserva}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Precio</p>
              <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: 'var(--accent-green)' }}>Bs. {activeReservaLocal.precio_total}</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button 
              onClick={() => {
                setConfirmedReserva(activeReservaLocal);
                setShowClientChat(true);
              }} 
              style={{ flex: 1, backgroundColor: '#1E4C9A', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              <MessageSquare size={18} /> Chat con Trabajador
            </button>
            <button 
              onClick={() => {
                localStorage.removeItem('active_reserva_lavamovil');
                setActiveReservaLocal(null);
              }}
              style={{ padding: '12px', backgroundColor: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Filtro de Categorías */}
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '48px' }}>
        {categorias.map(cat => (
          <button 
            key={cat}
            onClick={() => setCategoriaActiva(cat)}
            style={{
              padding: '8px 20px',
              borderRadius: '30px',
              border: categoriaActiva === cat ? 'none' : '1px solid var(--border-color)',
              backgroundColor: categoriaActiva === cat ? 'var(--accent-green)' : 'transparent',
              color: categoriaActiva === cat ? '#fff' : 'var(--text-muted)',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid de Servicios */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando catálogo...</div>
      ) : filteredServicios.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No hay servicios disponibles en esta categoría.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
          {filteredServicios.map(servicio => (
            <div 
              key={servicio.id} 
              style={{
                backgroundColor: 'var(--card-bg)',
                borderRadius: '16px',
                overflow: 'hidden',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                cursor: 'pointer',
                opacity: servicio.disponible !== false ? 1 : 0.6,
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                flexDirection: 'column'
              }}
              onMouseOver={(e) => { if(servicio.disponible !== false) e.currentTarget.style.transform = 'translateY(-4px)' }}
              onMouseOut={(e) => { if(servicio.disponible !== false) e.currentTarget.style.transform = 'translateY(0)' }}
            >
              {/* Imagen del Servicio */}
              <div style={{ height: '220px', backgroundColor: 'var(--bg-color)', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                {servicio.imagen_url ? (
                  <img src={servicio.imagen_url} alt={servicio.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-muted)' }}>
                    <ImageIcon size={48} style={{ marginBottom: '8px' }} />
                    <span style={{ fontSize: '12px' }}>IMAGEN DEL SERVICIO</span>
                  </div>
                )}
                
                <div style={{ position: 'absolute', top: '12px', left: '12px', backgroundColor: 'var(--accent-dark)', backdropFilter: 'blur(4px)', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {servicio.categoria}
                </div>
              </div>

              {/* Info del Servicio */}
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-main)' }}>
                  {servicio.nombre}
                </h3>
                
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '16px' }}>
                  <div style={{ color: 'var(--accent-green)', fontSize: '24px', fontWeight: '800' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '500', marginRight: '4px' }}>Bs.</span>
                    {servicio.precio}
                  </div>
                  
                  {servicio.disponible !== false ? (
                    <button 
                      onClick={() => handleBook(servicio)}
                      style={{ backgroundColor: '#1E4C9A', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }} 
                      onMouseOver={(e) => e.target.style.backgroundColor = '#153A7A'} 
                      onMouseOut={(e) => e.target.style.backgroundColor = '#1E4C9A'}
                    >
                      Agregar
                    </button>
                  ) : (
                    <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      No Disponible
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Reserva */}
      {showModal && selectedService && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '450px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)' }}>Agendar Servicio</h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            {success ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <CheckCircle size={64} color="var(--accent-green)" style={{ margin: '0 auto 16px auto' }} />
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '8px' }}>¡Reserva Confirmada!</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Hemos agendado tu servicio exitosamente. Pronto nos contactaremos contigo.</p>
                
                {confirmedReserva && (
                  <button 
                    onClick={() => setShowClientChat(true)} 
                    style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', width: '100%', marginBottom: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                  >
                    <MessageSquare size={18} /> Abrir Chat con Trabajador
                  </button>
                )}
                
                <button onClick={closeModal} style={{ backgroundColor: 'var(--accent-green)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
                  Volver al Catálogo
                </button>
              </div>
            ) : (
              <form onSubmit={submitReservation} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div style={{ backgroundColor: 'var(--bg-color)', padding: '16px', borderRadius: '8px', marginBottom: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>Servicio Seleccionado</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{selectedService.nombre}</div>
                    <div style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>Bs.{selectedService.precio}</div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '6px' }}>Tu Nombre</label>
                  <input type="text" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} required placeholder="Ej. Juan Pérez" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }} />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '6px' }}>Teléfono (WhatsApp)</label>
                  <input type="tel" value={clienteTelefono} onChange={(e) => setClienteTelefono(e.target.value)} required placeholder="Ej. 70012345" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }} />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '6px' }}>Vehículo (Marca y Modelo)</label>
                  <input type="text" value={vehiculo} onChange={(e) => setVehiculo(e.target.value)} required placeholder="Ej. Toyota Corolla" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Dirección / Ubicación GPS</label>
                    <button 
                      type="button" 
                      onClick={getGPSLocation}
                      disabled={isGettingLocation}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-green)', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {isGettingLocation ? 'Obteniendo...' : '📍 Usar mi ubicación actual'}
                    </button>
                  </div>
                  <input type="text" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} required placeholder="Ej. Av. Banzer o presiona el botón" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }} />
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '6px' }}>Fecha</label>
                    <input type="date" value={fechaReserva} onChange={(e) => setFechaReserva(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '6px' }}>Hora</label>
                    <input type="time" value={horaReserva} onChange={(e) => setHoraReserva(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }} />
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} style={{ backgroundColor: '#1E4C9A', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '16px', opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'Procesando...' : 'Confirmar Reserva'}
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Floating Chat For Client */}
      {showClientChat && (confirmedReserva || activeReservaLocal) && (
        <ClientChat 
          sessionId={(confirmedReserva || activeReservaLocal).chat_session_id || `fallback_${(confirmedReserva || activeReservaLocal).id}`} 
          onClose={() => setShowClientChat(false)} 
        />
      )}

    </div>
  );
}

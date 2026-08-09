import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, Droplets, CheckCircle, X, Moon, Sun, Send, MessageSquare, MapPin } from 'lucide-react';
import { supabase } from '../supabase';

// --- Inline Chat Component for Client ---
function ClientChat({ sessionId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

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
      rol: 'user'
    }]);

    if (error) {
      console.error("Error de Supabase al enviar chat:", error);
      alert(`Error al enviar mensaje: ${error.message}. Verifica que la tabla 'mensajes' exista y tenga permisos (RLS).`);
      setInput(msg); // Devolvemos el texto al input en caso de error
    }
  };

  return (
    <div className="client-chat-widget">
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E4C9A', color: '#fff', borderRadius: '12px 12px 0 0', flexShrink: 0 }}>
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>Chat con el Trabajador</h4>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}><X size={18} /></button>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.map((m, i) => (
          <div key={m.id || i} style={{ alignSelf: m.rol === 'bot' ? 'flex-start' : 'flex-end', backgroundColor: m.rol === 'bot' ? 'var(--bg-color)' : 'rgba(30, 76, 154, 0.2)', padding: '8px 12px', borderRadius: '8px', maxWidth: '80%', fontSize: '14px', border: m.rol === 'bot' ? '1px solid var(--border-color)' : 'none' }}>
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
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={sendMessage} style={{ padding: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px', flexShrink: 0 }}>
        <input 
          type="text" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder="Escribe un mensaje..." 
          style={{ flex: 1, padding: '8px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', outline: 'none', fontSize: '16px' }} 
        />
        <button type="submit" style={{ backgroundColor: '#1E4C9A', color: '#fff', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
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
  const [selectedServices, setSelectedServices] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
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
  
  // Active reservations loaded from local storage
  const [activeReservas, setActiveReservas] = useState([]);
  const [selectedReservaId, setSelectedReservaId] = useState(null);

  useEffect(() => {
    fetchServicios();
    
    // Check local storage for active reservations
    const savedReservas = localStorage.getItem('active_reservas_list_v2');
    let initialReservas = [];
    if (savedReservas) {
      try {
        initialReservas = JSON.parse(savedReservas);
      } catch (e) {
        console.error(e);
      }
    } else {
      // Migración de la versión anterior
      const oldReserva = localStorage.getItem('active_reserva_lavamovil');
      if (oldReserva) {
        try {
          initialReservas = [JSON.parse(oldReserva)];
          localStorage.setItem('active_reservas_list_v2', JSON.stringify(initialReservas));
        } catch (e) {}
      }
    }
    
    if (initialReservas.length > 0) {
      setActiveReservas(initialReservas);
      if (!selectedReservaId) setSelectedReservaId(initialReservas[0].id);
      checkReservaStatus(initialReservas.map(r => r.id));
    }
  }, []);

  const activeReservasIdsRef = useRef([]);

  useEffect(() => {
    activeReservasIdsRef.current = activeReservas.map(r => r.id);
  }, [activeReservas]);

  // Poll for status changes every 15 seconds safely
  useEffect(() => {
    let interval = setInterval(() => {
      const ids = activeReservasIdsRef.current;
      if (ids && ids.length > 0) {
        checkReservaStatus(ids);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const checkReservaStatus = async (ids) => {
    if (!ids || ids.length === 0) return;
    const { data, error } = await supabase.from('reservas').select('*').in('id', ids);
    if (!error && data) {
      setActiveReservas(data);
      localStorage.setItem('active_reservas_list_v2', JSON.stringify(data));
      
      // Auto-limpieza: remover completadas/canceladas después de 2 horas (opcional)
      // Por ahora las mantenemos visibles para que el cliente vea el historial de la sesión
    }
  };

  const fetchServicios = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('servicios').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching servicios:', error);
    } else {
      let sortedData = data || [];
      sortedData.sort((a, b) => {
        if (a.imagen_url && !b.imagen_url) return -1;
        if (!a.imagen_url && b.imagen_url) return 1;
        return 0;
      });
      setServicios(sortedData);
      const cats = ['Todos', ...new Set(sortedData.map(s => s.categoria).filter(Boolean))];
      setCategorias(cats);
    }
    setLoading(false);
  };

  const handleBook = (servicio) => {
    setSelectedServices([servicio]);
    setSuccess(false);
    setShowModal(true);
  };

  const handleEditReserva = () => {
    const reservaToEdit = activeReservas.find(r => r.id === selectedReservaId) || activeReservas[0];
    if (!reservaToEdit) return;
    
    if (!reservaToEdit.cliente_nombre) {
      alert("Por favor espera a que cargue la información de la reserva antes de editarla.");
      return;
    }

    setIsEditing(true);
    setSuccess(false);
    
    // Parse the data from reservaToEdit
    const nombreParts = reservaToEdit.cliente_nombre ? reservaToEdit.cliente_nombre.split(' - Tel: ') : [];
    setClienteNombre(nombreParts[0] || '');
    setClienteTelefono(nombreParts[1] || '');
    
    const vehiculoMatch = reservaToEdit.vehiculo ? reservaToEdit.vehiculo.match(/^(.*?)(?:\s*\(Adicionales:\s*(.*)\))?$/) : null;
    setVehiculo(vehiculoMatch ? vehiculoMatch[1] : (reservaToEdit.vehiculo || ''));
    
    setUbicacion(reservaToEdit.ubicacion_gps || '');
    setFechaReserva(reservaToEdit.fecha_reserva || '');
    setHoraReserva(reservaToEdit.hora_reserva ? reservaToEdit.hora_reserva.slice(0, 5) : '');
    
    const mainService = servicios.find(s => s.id === reservaToEdit.servicio_id);
    let reconstructedServices = mainService ? [mainService] : [];
    
    if (vehiculoMatch && vehiculoMatch[2]) {
      const extraNames = vehiculoMatch[2].split(', ');
      extraNames.forEach(name => {
        const found = servicios.find(s => s.nombre === name);
        if (found) reconstructedServices.push(found);
      });
    }
    
    setSelectedServices(reconstructedServices);
    setShowModal(true);
  };

  const addServicePlaceholder = () => {
    setSelectedServices([...selectedServices, { isPlaceholder: true, uniqueId: Date.now() }]);
  };

  const removeService = (index) => {
    setSelectedServices(selectedServices.filter((_, i) => i !== index));
  };

  const handleSelectAdditionalService = (index, serviceId) => {
    const service = servicios.find(s => s.id === serviceId);
    if (!service) return;
    
    // Check duplicates
    if (selectedServices.some(s => s.id === service.id)) {
      alert("Ese servicio ya fue agregado.");
      return;
    }
    
    const newServices = [...selectedServices];
    newServices[index] = { ...service, uniqueId: newServices[index].uniqueId || Date.now() };
    setSelectedServices(newServices);
  };

  const submitReservation = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const validServices = selectedServices.filter(s => !s.isPlaceholder);
    if (validServices.length === 0) {
      alert("Debes seleccionar al menos un servicio.");
      setIsSubmitting(false);
      return;
    }

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

    const mainService = validServices[0];
    const totalPrice = validServices.reduce((sum, s) => sum + Number(s.precio), 0);
    const additionalNames = validServices.length > 1 ? ` (Adicionales: ${validServices.slice(1).map(s => s.nombre).join(', ')})` : '';

    if (isEditing) {
      const reservaToEdit = activeReservas.find(r => r.id === selectedReservaId) || activeReservas[0];
      const { data: updateData, error } = await supabase.from('reservas').update({
        cliente_nombre: `${clienteNombre} - Tel: ${clienteTelefono}`,
        vehiculo: `${vehiculo}${additionalNames}`,
        ubicacion_gps: ubicacion,
        fecha_reserva: fechaReserva,
        hora_reserva: formattedHora,
        servicio_id: mainService.id,
        precio_total: totalPrice,
      }).eq('id', reservaToEdit.id).select();

      if (error) {
        console.error('Error actualizando reserva:', error);
        alert('Hubo un error al actualizar tu reserva: ' + (error.message || JSON.stringify(error)));
      } else {
        if (updateData && updateData.length > 0) {
          const updatedArr = activeReservas.map(r => r.id === updateData[0].id ? updateData[0] : r);
          setActiveReservas(updatedArr);
          localStorage.setItem('active_reservas_list_v2', JSON.stringify(updatedArr));
        }
        setSuccess(true);
        setTimeout(() => {
          setShowModal(false);
          setSelectedServices([]);
          setIsEditing(false);
        }, 2500);
      }
      setIsSubmitting(false);
      return;
    }

    const { data: insertData, error } = await supabase.from('reservas').insert([
      {
        cliente_nombre: `${clienteNombre} - Tel: ${clienteTelefono}`,
        vehiculo: `${vehiculo}${additionalNames}`,
        ubicacion_gps: ubicacion,
        fecha_reserva: fechaReserva,
        hora_reserva: formattedHora,
        servicio_id: mainService.id,
        precio_total: totalPrice,
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
        const updatedArr = [insertData[0], ...activeReservas];
        setActiveReservas(updatedArr);
        setSelectedReservaId(insertData[0].id);
        localStorage.setItem('active_reservas_list_v2', JSON.stringify(updatedArr));
      }
      setSuccess(true);
      
      // Dispatch notification
      await supabase.from('notificaciones').insert([{
        mensaje: `Nueva reserva: ${clienteNombre} - ${validServices.map(s => s.nombre).join(' + ')}`,
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
    setSelectedServices([]);
    setConfirmedReserva(null);
    setShowClientChat(false);
    setIsEditing(false);
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
    <div className="landing-page" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
      {/* Navbar Simple */}
      <nav className="landing-nav">
        <Link to="/" style={{ color: '#b0c4de', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#fff'} onMouseOut={(e) => e.target.style.color = '#b0c4de'}>
          <ArrowLeft size={16} /> Volver
        </Link>
        
        <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src="/logo.png" 
            alt="Lavamóvil Norte" 
            className="landing-logo-img"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          {/* Logo Textual Fallback */}
          <div style={{ display: 'none', alignItems: 'center', fontWeight: 900, fontSize: '20px' }}>
            <span style={{ color: '#1E4C9A' }}>LAVA</span>
            <span style={{ color: '#1CA9C9', margin: '0 2px' }}>M</span>
            <span style={{ color: '#1E4C9A' }}>ÓVIL</span>
          </div>
        </Link>
        
        <div style={{ width: '80px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={toggleTheme} className="theme-toggle-btn" aria-label="Toggle theme">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </nav>

      <main className="landing-hero" style={{ maxWidth: '1200px', width: '100%', padding: '0 24px 64px 24px', flex: 'none', display: 'block' }}>

      {/* Header del Catálogo */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div className="landing-subtitle">CATÁLOGO DE SERVICIOS</div>
        <div className="landing-title" style={{ gap: '16px', marginBottom: '16px' }}>
          <div className="landing-title-icon" style={{ width: '60px', height: '60px', borderRadius: '16px' }}>
            <Droplets size={32} />
          </div>
          <span style={{ fontSize: '42px', color: '#1E4C9A' }}>Reserva tu <span style={{ color: '#1CA9C9' }}>Lavado</span></span>
        </div>
        <p className="landing-text" style={{ margin: '0 auto', fontSize: '16px', maxWidth: '500px' }}>
          Selecciona el paquete de lavado ideal para tu vehículo. Agendaremos tu servicio a domicilio.
        </p>
      </div>

      {/* Apartado Reserva Pendiente / Activa */}
      {activeReservas.length > 0 && (() => {
        const reserva = activeReservas.find(r => r.id === selectedReservaId) || activeReservas[0];
        if (!reserva) return null;

        return (
          <div className="service-glass-card" style={{ maxWidth: '800px', margin: '0 auto 48px auto', padding: '24px', animation: 'fadeUp 0.8s ease-out 0.2s forwards' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={24} color="#1CA9C9" /> {activeReservas.length === 1 ? 'Mi Reserva Activa' : 'Mis Reservas Activas'}
                </h2>
                
                {activeReservas.length > 1 && (
                  <select 
                    value={selectedReservaId || ''} 
                    onChange={(e) => setSelectedReservaId(e.target.value)}
                    style={{
                      padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(28, 169, 201, 0.3)',
                      backgroundColor: 'rgba(28, 169, 201, 0.1)', color: 'var(--text-main)', outline: 'none',
                      fontWeight: 'bold', cursor: 'pointer'
                    }}
                  >
                    {activeReservas.map((r, i) => (
                      <option key={r.id} value={r.id} style={{ color: '#000' }}>
                        Reserva {i + 1} - {r.vehiculo ? r.vehiculo.split(' (')[0] : 'Cargando...'}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', 
                backgroundColor: 
                  reserva.estado_reserva === 'pendiente' ? 'rgba(245, 158, 11, 0.1)' : 
                  reserva.estado_reserva === 'asignado' ? 'rgba(59, 130, 246, 0.1)' :
                  reserva.estado_reserva === 'en_camino' ? 'rgba(16, 185, 129, 0.1)' :
                  reserva.estado_reserva === 'en_proceso' ? 'rgba(234, 179, 8, 0.1)' :
                  reserva.estado_reserva === 'completado' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.1)',
                color: 
                  reserva.estado_reserva === 'pendiente' ? '#f59e0b' : 
                  reserva.estado_reserva === 'asignado' ? '#3b82f6' :
                  reserva.estado_reserva === 'en_camino' ? '#10b981' :
                  reserva.estado_reserva === 'en_proceso' ? '#eab308' :
                  reserva.estado_reserva === 'completado' ? '#10b981' : '#94a3b8'
              }}>
                {reserva.estado_reserva ? reserva.estado_reserva.replace('_', ' ').toUpperCase() : 'PENDIENTE'}
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Vehículo</p>
                <p style={{ margin: '4px 0 0 0', fontWeight: 'bold' }}>{reserva.vehiculo || 'Cargando información...'}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Fecha y Hora</p>
                <p style={{ margin: '4px 0 0 0', fontWeight: 'bold' }}>{reserva.fecha_reserva || '---'} a las {reserva.hora_reserva || '---'}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Precio</p>
                <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: '#1CA9C9' }}>Bs. {reserva.precio_total || '0'}</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => {
                  setConfirmedReserva(reserva);
                  setShowClientChat(true);
                }} 
                className="btn-glass-primary"
                style={{ flex: 1, minWidth: '180px', justifyContent: 'center' }}
              >
                <MessageSquare size={18} /> Chat con Trabajador
              </button>
              <button 
                onClick={() => setShowDetailsModal(true)} 
                className="glass-pill"
                style={{ flex: 1, minWidth: '120px', justifyContent: 'center', backgroundColor: 'rgba(28, 169, 201, 0.1)', color: '#1CA9C9', border: '1px solid rgba(28, 169, 201, 0.3)' }}
              >
                Ver Detalles
              </button>
              <button 
                onClick={handleEditReserva} 
                className="glass-pill"
                style={{ flex: 1, minWidth: '120px', justifyContent: 'center' }}
              >
                Editar Reserva
              </button>
              <button 
                onClick={() => {
                  const updated = activeReservas.filter(r => r.id !== reserva.id);
                  setActiveReservas(updated);
                  localStorage.setItem('active_reservas_list_v2', JSON.stringify(updated));
                  if (updated.length > 0) setSelectedReservaId(updated[0].id);
                }}
                className="glass-pill"
                style={{ padding: '8px', minWidth: '40px', color: '#ef4444' }}
                title="Ocultar esta reserva"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        );
      })()}

      {/* Filtro de Categorías */}
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '48px', animation: 'fadeUp 0.8s ease-out 0.4s forwards', opacity: 0 }}>
        {categorias.map(cat => (
          <button 
            key={cat}
            onClick={() => setCategoriaActiva(cat)}
            className={`glass-pill ${categoriaActiva === cat ? 'active' : ''}`}
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
              className="service-glass-card"
              style={{
                opacity: servicio.disponible !== false ? 1 : 0.6,
                cursor: servicio.disponible !== false ? 'pointer' : 'default',
                animation: 'fadeUp 0.8s ease-out 0.6s forwards'
              }}
              onMouseOver={(e) => { if(servicio.disponible !== false) e.currentTarget.style.transform = 'translateY(-5px)' }}
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
                      className="btn-glass-primary"
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
      {showModal && selectedServices.length > 0 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="service-glass-card" style={{ padding: '32px', width: '100%', maxWidth: '450px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)' }}>Agendar Servicio</h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            {success ? (
              <div style={{ textAlign: 'center', padding: '32px 0', animation: 'fadeUp 0.4s ease-out forwards' }}>
                <CheckCircle size={64} color="var(--accent-green)" style={{ margin: '0 auto 16px auto' }} />
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '8px' }}>
                  {isEditing ? '¡Reserva actualizada correctamente!' : '¡Reserva Confirmada!'}
                </h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                  {isEditing ? 'Tus cambios han sido guardados y están sincronizados.' : 'Hemos agendado tu servicio exitosamente. Pronto nos contactaremos contigo.'}
                </p>
                
                {!isEditing && confirmedReserva && (
                  <button 
                    onClick={() => setShowClientChat(true)} 
                    className="btn-glass-primary"
                    style={{ width: '100%', marginBottom: '12px' }}
                  >
                    <MessageSquare size={18} /> Abrir Chat con Trabajador
                  </button>
                )}
                
                <button onClick={closeModal} className="glass-pill" style={{ width: '100%' }}>
                  {isEditing ? 'Cerrar' : 'Volver al Catálogo'}
                </button>
              </div>
            ) : (
              <form onSubmit={submitReservation} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Lista de Servicios */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                  {selectedServices.map((srv, index) => {
                    const isMain = index === 0;
                    return (
                      <div key={srv.uniqueId || srv.id || index} className="service-glass-card" style={{ padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', position: 'relative', animation: 'fadeUp 0.4s ease-out forwards' }}>
                        <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                          {isMain ? 'Servicio Principal' : `Servicio Adicional ${index}`}
                        </div>
                        
                        {srv.isPlaceholder ? (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                            <select 
                              value=""
                              onChange={(e) => handleSelectAdditionalService(index, e.target.value)}
                              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', outline: 'none', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                            >
                              <option value="" disabled>Seleccionar servicio...</option>
                              {servicios.map(s => (
                                <option key={s.id} value={s.id} disabled={selectedServices.some(sel => sel.id === s.id)}>{s.nombre} - Bs.{s.precio}</option>
                              ))}
                            </select>
                            <div style={{ color: 'var(--text-muted)', fontWeight: 'bold', width: '50px', textAlign: 'right' }}>Bs.0</div>
                            <button type="button" onClick={() => removeService(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', fontSize: '16px' }} title="Eliminar">
                              🗑️
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{srv.nombre}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>Bs.{srv.precio}</div>
                              {!isMain && (
                                <button type="button" onClick={() => removeService(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }} title="Eliminar">
                                  🗑️ <span className="hide-mobile">Eliminar</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  <button 
                    type="button" 
                    onClick={addServicePlaceholder}
                    style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
                      padding: '12px', borderRadius: '8px', border: '1px dashed var(--accent-green)', 
                      backgroundColor: 'rgba(28, 169, 201, 0.05)', color: 'var(--accent-green)', 
                      cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s',
                      marginTop: '4px'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(28, 169, 201, 0.15)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(28,169,201,0.2)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(28, 169, 201, 0.05)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <span style={{ fontSize: '18px' }}>+</span> Adicionar otro servicio
                  </button>
                </div>

                {/* Total Resumen */}
                {selectedServices.length > 1 && (
                  <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-main)' }}>Resumen</div>
                    {selectedServices.filter(s => !s.isPlaceholder).map((s, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        <span>Servicio {i + 1}: {s.nombre}</span>
                        <span style={{ fontWeight: '500' }}>Bs.{s.precio}</span>
                      </div>
                    ))}
                    <div style={{ borderTop: '1px dashed var(--border-color)', margin: '12px 0' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--accent-green)', fontSize: '18px' }}>
                      <span>Total</span>
                      <span>Bs.{selectedServices.reduce((sum, s) => sum + (s.isPlaceholder ? 0 : Number(s.precio)), 0)}</span>
                    </div>
                  </div>
                )}

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

                <button type="submit" disabled={isSubmitting} className="btn-glass-primary" style={{ marginTop: '16px', padding: '14px', fontSize: '16px', width: '100%', justifyContent: 'center', opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'Procesando...' : (isEditing ? 'Guardar Cambios' : 'Confirmar Reserva')}
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      </main>

      {/* Modal de Detalles de Reserva */}
      {showDetailsModal && activeReservas.length > 0 && (() => {
        const reserva = activeReservas.find(r => r.id === selectedReservaId) || activeReservas[0];
        if (!reserva) return null;
        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
            <div className="service-glass-card" style={{ padding: '32px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', animation: 'fadeUp 0.3s ease-out forwards' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)' }}>Detalle de la Reserva</h2>
                <button onClick={() => setShowDetailsModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
              </div>
              
              {/* Client Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Cliente</div>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{reserva.cliente_nombre ? reserva.cliente_nombre.split(' - Tel: ')[0] : 'Cargando...'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>WhatsApp</div>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{reserva.cliente_nombre ? (reserva.cliente_nombre.split(' - Tel: ')[1] || 'N/A') : 'Cargando...'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Vehículo</div>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{reserva.vehiculo ? reserva.vehiculo.split(' (Adicionales:')[0] : 'Cargando...'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Estado</div>
                  <div style={{ fontWeight: 'bold', color: 'var(--accent-green)', textTransform: 'uppercase' }}>{reserva.estado_reserva?.replace('_', ' ')}</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Fecha</div>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{reserva.fecha_reserva || '---'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Hora</div>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{reserva.hora_reserva ? reserva.hora_reserva.slice(0,5) : '---'}</div>
                </div>
              </div>
            
            {/* Services Breakdown */}
            <div style={{ backgroundColor: 'var(--bg-color)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-main)' }}>Servicios</div>
              
              {/* Main Service */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
                <span>✔ {servicios.find(s => s.id === reserva.servicio_id)?.nombre || 'Servicio Principal'}</span>
                <span style={{ fontWeight: '500' }}>Bs.{servicios.find(s => s.id === reserva.servicio_id)?.precio || '...'}</span>
              </div>
              
              {/* Additional Services */}
              {reserva.vehiculo?.match(/\(Adicionales:\s*(.*)\)/) && reserva.vehiculo.match(/\(Adicionales:\s*(.*)\)/)[1].split(', ').map((extra, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
                  <span>✔ {extra}</span>
                  <span style={{ fontWeight: '500' }}>Bs.{servicios.find(s => s.nombre === extra)?.precio || '...'}</span>
                </div>
              ))}
              
              <div style={{ borderTop: '1px dashed var(--border-color)', margin: '12px 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--accent-green)', fontSize: '18px' }}>
                <span>TOTAL</span>
                <span>Bs.{reserva.precio_total || '0'}</span>
              </div>
            </div>
            
            {/* Location */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Ubicación</div>
              <div style={{ fontWeight: '500', color: 'var(--text-main)' }}>{reserva.ubicacion_gps || 'Cargando...'}</div>
              {reserva.ubicacion_gps && reserva.ubicacion_gps.includes(',') ? (
                <div style={{ marginTop: '8px', height: '120px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  <MapPin size={24} style={{ marginRight: '8px' }} /> Mapa (Ubicación GPS)
                </div>
              ) : (
                <div style={{ marginTop: '8px', padding: '12px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '8px', fontSize: '14px', textAlign: 'center' }}>
                  Ubicación pendiente o ingresada manualmente
                </div>
              )}
            </div>

            {/* Timeline */}
            <div style={{ backgroundColor: 'var(--bg-color)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-main)' }}>Progreso del Servicio</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '11px', top: '10px', bottom: '10px', width: '2px', backgroundColor: 'var(--border-color)', zIndex: 0 }}></div>
                
                {[
                  { key: 'pendiente', label: 'Reserva Creada' },
                  { key: 'asignado', label: 'Trabajador Asignado' },
                  { key: 'en_camino', label: 'En Camino' },
                  { key: 'en_proceso', label: 'En Proceso' },
                  { key: 'completado', label: 'Finalizado' }
                ].map((status, index) => {
                  const states = ['pendiente', 'asignado', 'en_camino', 'en_proceso', 'completado'];
                  const currentIndex = states.indexOf(reserva.estado_reserva || 'pendiente');
                  const isCompleted = index <= currentIndex;
                  const isCurrent = index === currentIndex;
                  
                  return (
                    <div key={status.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', zIndex: 1 }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: isCompleted ? 'var(--accent-green)' : 'var(--bg-color)', border: isCompleted ? 'none' : '2px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', transition: 'all 0.3s' }}>
                        {isCompleted && <CheckCircle size={14} />}
                      </div>
                      <div style={{ fontWeight: isCurrent ? 'bold' : 'normal', color: isCompleted ? 'var(--text-main)' : 'var(--text-muted)' }}>
                        {status.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
              {/* Main Service Info */}
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '12px' }}>Resumen de Pago</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px dashed var(--border-color)' }}>
                  <span style={{ color: 'var(--text-main)' }}>Lavado Base</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>Bs. {reserva.precio_total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', marginTop: '8px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--text-main)' }}>Total Pagado</span>
                  <span style={{ fontWeight: 'bold', fontSize: '20px', color: 'var(--accent-green)' }}>Bs. {reserva.precio_total}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button 
                  onClick={() => {
                    setConfirmedReserva(reserva);
                    setShowDetailsModal(false);
                    setShowClientChat(true);
                  }} 
                  className="btn-glass-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Abrir Chat
                </button>
                <button 
                  onClick={() => setShowDetailsModal(false)} 
                  className="glass-pill"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating Chat For Client */}
      {showClientChat && (confirmedReserva || activeReservas.length > 0) && (() => {
        const chatReserva = confirmedReserva || activeReservas.find(r => r.id === selectedReservaId) || activeReservas[0];
        return (
          <ClientChat 
            sessionId={chatReserva.chat_session_id || `fallback_${chatReserva.id}`} 
            onClose={() => setShowClientChat(false)} 
          />
        );
      })()}

    </div>
  );
}

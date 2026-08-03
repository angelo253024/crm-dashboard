import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, Droplets, CheckCircle, X, Moon, Sun, Clock } from 'lucide-react';
import { supabase } from '../supabase';

const PromoAd = ({ onBook }) => {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f3d6b 0%, #1b5b96 100%)',
      borderRadius: '24px',
      padding: '24px',
      color: 'white',
      textAlign: 'center',
      position: 'sticky',
      top: '24px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
      overflow: 'hidden'
    }}>
       {/* Fake diagonal lines using CSS background */}
       <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.02) 20px, rgba(255,255,255,0.02) 40px)',
          pointerEvents: 'none'
       }} />

       <div style={{ position: 'relative', zIndex: 1 }}>
         <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
           <span style={{ backgroundColor: '#fff', color: '#0f3d6b', fontSize: '10px', fontWeight: '900', padding: '2px 6px', borderRadius: '4px' }}>Ad</span>
         </div>
         
         {/* Logo */}
         <div style={{ marginBottom: '16px' }}>
            <div style={{ fontFamily: 'cursive, "Brush Script MT", sans-serif', fontSize: '28px', lineHeight: '1' }}>Lava</div>
            <div style={{ fontFamily: 'cursive, "Brush Script MT", sans-serif', fontSize: '32px', color: '#1ccaff', lineHeight: '1' }}>Móvil</div>
            <div style={{ fontSize: '10px', letterSpacing: '6px', fontWeight: 'bold', marginTop: '4px' }}>N O R T E</div>
         </div>

         {/* Car Image Placeholder */}
         <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', height: '110px', borderRadius: '12px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '24px', paddingBottom: '8px', fontSize: '10px', letterSpacing: '1px', borderBottom: '2px solid #1ccaff' }}>
           JIMNY • SUZUKI ALTO
         </div>

         {/* Text content */}
         <div style={{ fontFamily: 'cursive, "Brush Script MT", sans-serif', fontSize: '38px', marginBottom: '8px' }}>Lavado</div>
         <div style={{ border: '2px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '6px 20px', display: 'inline-block', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '24px', fontSize: '14px' }}>
           CLÁSICO
         </div>

         {/* Circle P */}
         <div style={{ width: '64px', height: '64px', backgroundColor: '#1ccaff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', fontSize: '32px', fontWeight: '900', color: '#0f3d6b' }}>
           P
         </div>

         <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Ideal para autos pequeños</div>

         <div style={{ fontSize: '56px', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px', lineHeight: 1 }}>
           <span style={{ fontSize: '24px' }}>Bs.</span> 60
         </div>
         <div style={{ fontSize: '11px', letterSpacing: '2px', fontWeight: 'bold', color: '#1ccaff', marginBottom: '24px' }}>
           PRECIO CLÁSICO
         </div>

         {/* Premium Box */}
         <div style={{ border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
           <div style={{ fontSize: '13px', fontWeight: 'bold' }}>VERSIÓN PREMIUM</div>
           <div style={{ fontSize: '18px', fontWeight: '900', color: '#1ccaff' }}>Bs.120</div>
         </div>

         <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', marginBottom: '20px', lineHeight: '1.4' }}>
           *En caso de exceso de pelo o barro, se cobrará un costo adicional de 10 a 20Bs.
         </div>

         {/* CTA */}
         <button 
           onClick={onBook}
           style={{ backgroundColor: '#1ccaff', color: '#0f3d6b', border: 'none', width: '100%', padding: '16px', borderRadius: '12px', fontSize: '16px', fontWeight: '900', cursor: 'pointer', transition: 'transform 0.2s' }}
           onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
           onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
         >
           ¡Agenda tu lavado hoy!
           <div style={{ fontSize: '11px', fontWeight: '600', marginTop: '4px', color: '#0f3d6b' }}>
             Visítanos en Lava Móvil Norte
           </div>
         </button>

       </div>
    </div>
  )
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
  const [ubicacionGps, setUbicacionGps] = useState('');
  const [vehiculo, setVehiculo] = useState('');
  const [fechaReserva, setFechaReserva] = useState('');
  const [horaReserva, setHoraReserva] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchServicios();
  }, []);

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

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUbicacionGps(`${position.coords.latitude},${position.coords.longitude}`);
        },
        (error) => {
          alert('No se pudo obtener la ubicación automáticamente. Por favor, escribe tu dirección manualmente.');
        }
      );
    } else {
      alert('Tu navegador no soporta geolocalización.');
    }
  };

  const submitReservation = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formattedHora = horaReserva.length === 5 ? `${horaReserva}:00` : horaReserva;

    const { error } = await supabase.from('reservas').insert([
      {
        cliente_nombre: clienteNombre,
        cliente_telefono: clienteTelefono,
        ubicacion_gps: ubicacionGps,
        vehiculo: vehiculo,
        fecha_reserva: fechaReserva,
        hora_reserva: formattedHora,
        servicio_id: selectedService.id,
        precio_total: selectedService.precio,
        estado: 'Reservado'
      }
    ]);

    if (error) {
      console.error('Error guardando reserva:', error);
      alert('Hubo un error al procesar tu reserva. Inténtalo de nuevo.');
    } else {
      setSuccess(true);
      
      // Dispatch notification
      await supabase.from('notificaciones').insert([{
        mensaje: `Nueva reserva: ${clienteNombre} - ${selectedService.nombre}`,
        tipo: 'info'
      }]);

      setClienteNombre('');
      setClienteTelefono('');
      setUbicacionGps('');
      setVehiculo('');
      setFechaReserva('');
      setHoraReserva('');
    }
    setIsSubmitting(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedService(null);
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
        <div style={{ display: 'flex', gap: '32px', maxWidth: '1200px', margin: '0 auto', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          
          {/* Columna Principal - Catálogo */}
          <div style={{ flex: '1 1 600px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
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
                    
                    {servicio.descripcion && (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: '1.4' }}>
                        {servicio.descripcion}
                      </p>
                    )}
                    
                    {servicio.tiempo_estimado && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', fontWeight: 'bold' }}>
                        <Clock size={14} /> <span>{servicio.tiempo_estimado}</span>
                      </div>
                    )}
                    
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
          </div>

          {/* Columna Lateral - Anuncio */}
          <div style={{ flex: '1 1 320px', maxWidth: '400px', margin: '0 auto' }}>
            <PromoAd onBook={() => {
              const clasicoP = servicios.find(s => s.codigo === 'CLAS-P00');
              if (clasicoP) {
                handleBook(clasicoP);
              } else {
                alert('Este servicio actualmente no está disponible en el catálogo.');
              }
            }} />
          </div>

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

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '6px' }}>Tu Nombre</label>
                    <input type="text" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} required placeholder="Ej. Juan Pérez" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '6px' }}>Teléfono / Celular</label>
                    <input type="tel" value={clienteTelefono} onChange={(e) => setClienteTelefono(e.target.value)} required placeholder="Ej. 70012345" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    <span>Dirección del Domicilio / Ubicación</span>
                    <button type="button" onClick={handleGetLocation} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}>📍 Usar GPS actual</button>
                  </label>
                  <input type="text" value={ubicacionGps} onChange={(e) => setUbicacionGps(e.target.value)} required placeholder="Ej. Av. Banzer 4to Anillo o enviar GPS" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }} />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '6px' }}>Vehículo (Marca y Modelo)</label>
                  <input type="text" value={vehiculo} onChange={(e) => setVehiculo(e.target.value)} required placeholder="Ej. Toyota Corolla" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }} />
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

    </div>
  );
}

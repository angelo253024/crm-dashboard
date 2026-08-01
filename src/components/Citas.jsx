import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, X, MapPin, Car, User, Database } from 'lucide-react';
import { supabase } from '../supabase';

export default function Citas() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  useEffect(() => {
    fetchReservas();
  }, []);

  const fetchReservas = async () => {
    setLoading(true);
    // Hacemos un join con la tabla servicios para obtener el nombre
    const { data, error } = await supabase
      .from('reservas')
      .select('*, servicios(nombre)')
      .order('fecha_reserva', { ascending: true })
      .order('hora_reserva', { ascending: true });
      
    if (error) {
      console.error('Error fetching reservas:', error);
    } else {
      // Map database format to calendar format
      const formattedEvents = data.map(res => {
        const dateObj = new Date(res.fecha_reserva);
        // getDay() returns 0 for Sunday, 1 for Monday, etc. Adjusting to 0=Monday, 6=Sunday
        let dayIndex = dateObj.getDay() - 1;
        if (dayIndex === -1) dayIndex = 6;
        
        return {
          id: res.id,
          day: dayIndex,
          time: res.hora_reserva.substring(0, 5), // 'HH:MM:SS' to 'HH:MM'
          title: res.servicios ? res.servicios.nombre : 'Servicio Personalizado',
          customer: res.cliente_nombre,
          status: res.estado,
          price: res.precio_total,
          car: res.vehiculo
        };
      });
      setEvents(formattedEvents);
    }
    setLoading(false);
  };

  const seedReservas = async () => {
    // Primero, traemos un servicio cualquiera para referenciarlo
    const { data: servs } = await supabase.from('servicios').select('id').limit(1);
    const serviceId = servs && servs.length > 0 ? servs[0].id : null;

    if (!serviceId) {
      alert("Debes poblar la tabla de Servicios primero en la pestaña Productos");
      return;
    }

    const today = new Date();
    // Helper to get a date string relative to today
    const getRelativeDate = (offsetDays) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().split('T')[0];
    };

    const mockReservas = [
      { cliente_nombre: 'Carlos Ruiz', vehiculo: 'Toyota Hilux', fecha_reserva: getRelativeDate(0), hora_reserva: '10:00:00', servicio_id: serviceId, precio_total: 130, estado: 'Finalizado' },
      { cliente_nombre: 'Ana Gómez', vehiculo: 'Ford Explorer', fecha_reserva: getRelativeDate(1), hora_reserva: '11:30:00', servicio_id: serviceId, precio_total: 80, estado: 'En Proceso' },
      { cliente_nombre: 'Luis Paz', vehiculo: 'Trek Marlin', fecha_reserva: getRelativeDate(2), hora_reserva: '14:00:00', servicio_id: serviceId, precio_total: 20, estado: 'Reservado' },
      { cliente_nombre: 'Marta Díaz', vehiculo: 'Jeep Wrangler', fecha_reserva: getRelativeDate(3), hora_reserva: '09:00:00', servicio_id: serviceId, precio_total: 150, estado: 'Reservado' }
    ];

    const { error } = await supabase.from('reservas').insert(mockReservas);
    if (error) {
      alert('Error poblando reservas');
      console.error(error);
    } else {
      alert('Reservas iniciales agregadas');
      fetchReservas();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Finalizado': return '#10b981'; // green
      case 'En Proceso': return '#f59e0b'; // yellow
      case 'Reservado': return '#3b82f6';  // blue
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 className="text-h2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarIcon size={24} color="var(--accent-green)" /> Agenda Semanal
          </h2>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
             {events.length === 0 && !loading && (
               <button className="btn-secondary" onClick={seedReservas}>
                 <Database size={16} /> Poblar Reservas
               </button>
             )}
             <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{width: 10, height: 10, borderRadius: '50%', backgroundColor: '#3b82f6'}}></div> Reservado</span>
             <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{width: 10, height: 10, borderRadius: '50%', backgroundColor: '#f59e0b'}}></div> En Proceso</span>
             <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10b981'}}></div> Finalizado</span>
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '40px' }}>Cargando agenda...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
            {days.map((day, i) => (
              <div key={day} style={{ minHeight: '400px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-color)' }}>
                <div style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', fontWeight: '600', backgroundColor: 'var(--card-bg)', borderTopLeftRadius: 'var(--radius-sm)', borderTopRightRadius: 'var(--radius-sm)' }}>
                  {day}
                </div>
                <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {events.filter(e => e.day === i).map(ev => (
                    <div 
                      key={ev.id} 
                      onClick={() => setSelectedEvent(ev)}
                      style={{ 
                        backgroundColor: 'var(--card-bg)', 
                        borderLeft: `4px solid ${getStatusColor(ev.status)}`, 
                        padding: '8px', 
                        borderRadius: '4px',
                        cursor: 'pointer',
                        boxShadow: 'var(--shadow-card)',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>{ev.time}</div>
                      <div style={{ color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{ev.title}</div>
                      <div style={{ color: 'var(--text-muted)' }}>{ev.customer}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--card-bg)', padding: '24px', borderRadius: 'var(--radius-lg)', width: '400px', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <h2 className="text-h2">Detalle de Reserva</h2>
              <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Clock size={18} color="var(--accent-green)" />
                <span className="text-body font-semibold">{days[selectedEvent.day]} a las {selectedEvent.time}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <User size={18} color="var(--accent-green)" />
                <span className="text-body">{selectedEvent.customer}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Car size={18} color="var(--accent-green)" />
                <span className="text-body">{selectedEvent.car}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <MapPin size={18} color="var(--accent-green)" />
                <span className="text-body">{selectedEvent.title}</span>
              </div>
              
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="text-small text-muted">Estado</div>
                  <div style={{ color: getStatusColor(selectedEvent.status), fontWeight: '600' }}>{selectedEvent.status}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="text-small text-muted">Precio Total</div>
                  <div className="text-h2" style={{ color: 'var(--accent-green)' }}>Bs.{selectedEvent.price}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, X, MapPin, Car, User, UserCheck, Database, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { supabase } from '../supabase';
import { autoAssignWorker } from '../utils/autoAssignWorker';

export default function Citas() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDateStr, setSelectedDateStr] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [trabajadoresList, setTrabajadoresList] = useState([]);
  const [serviciosList, setServiciosList] = useState([]);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    cliente_nombre: '',
    vehiculo: '',
    servicio_id: '',
    trabajador_id: '',
    fecha_reserva: '',
    hora_reserva: '',
    ubicacion_gps: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  useEffect(() => {
    fetchReservas();

    const channel = supabase
      .channel('citas_reservas_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, () => {
        fetchReservas();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchReservas = async () => {
    setLoading(true);
    const [resReservas, resTrabajadores, resServicios] = await Promise.all([
      supabase.from('reservas').select('*').order('fecha_reserva', { ascending: true }),
      supabase.from('trabajadores').select('id, nombre'),
      supabase.from('servicios').select('id, nombre, precio')
    ]);
      
    if (resReservas.error) {
      console.error('Error fetching reservas:', resReservas.error);
    } else {
      const tList = resTrabajadores.data || [];
      const sList = resServicios.data || [];
      setTrabajadoresList(tList);
      setServiciosList(sList);
      
      const formattedEvents = resReservas.data.map(res => {
        let workerName = 'Sin asignar';
        if (res.trabajador && typeof res.trabajador === 'string') {
           workerName = res.trabajador;
        } else if (res.trabajador_id || res.empleado_id) {
           const wId = res.trabajador_id || res.empleado_id;
           const worker = tList.find(t => t.id === wId);
           if (worker) workerName = worker.nombre;
        } else if (res.trabajadores && res.trabajadores.nombre) {
           workerName = res.trabajadores.nombre;
        }

        let serviceName = 'Servicio Personalizado';
        if (res.servicios && res.servicios.nombre) {
          serviceName = res.servicios.nombre;
        } else if (res.servicio_id) {
          const s = sList.find(s => s.id === res.servicio_id);
          if (s) serviceName = s.nombre;
        }

        return {
          id: res.id,
          dateStr: res.fecha_reserva,
          time: res.hora_reserva ? res.hora_reserva.substring(0, 5) : '00:00',
          title: serviceName,
          customer: res.cliente_nombre,
          status: res.estado,
          price: res.precio_total,
          car: res.vehiculo,
          worker: workerName,
          paymentMethod: res.payment_method,
          paymentStatus: res.payment_status
        };
      });
      setEvents(formattedEvents);
    }
    setLoading(false);
  };

  const seedReservas = async () => {
    const { data: servs } = await supabase.from('servicios').select('id').limit(1);
    const serviceId = servs && servs.length > 0 ? servs[0].id : null;

    if (!serviceId) {
      alert("Debes poblar la tabla de Servicios primero en la pestaña Productos");
      return;
    }

    const today = new Date();
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

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const selectedService = serviciosList.find(s => s.id === manualForm.servicio_id);
      const totalPrice = selectedService ? (selectedService.precio || 0) : 0;

      if (totalPrice < 100) {
        alert(`⚠️ El monto mínimo para agendar una reserva es de 100 Bs. El servicio seleccionado cuesta Bs. ${totalPrice}.`);
        setIsSubmitting(false);
        return;
      }
      
      const finalTrabajadorId = await autoAssignWorker(supabase, manualForm.trabajador_id);

      const newReserva = {
        cliente_nombre: manualForm.cliente_nombre,
        vehiculo: manualForm.vehiculo,
        fecha_reserva: manualForm.fecha_reserva,
        hora_reserva: manualForm.hora_reserva + ':00',
        servicio_id: manualForm.servicio_id,
        trabajador_id: finalTrabajadorId,
        ubicacion_gps: manualForm.ubicacion_gps,
        estado: 'Reservado',
        estado_reserva: 'confirmada',
        precio_total: totalPrice,
      };
      
      const { error } = await supabase.from('reservas').insert([newReserva]);
      if (error) throw error;
      
      alert('Cita agregada exitosamente');
      setShowManualModal(false);
      setManualForm({
        cliente_nombre: '',
        vehiculo: '',
        servicio_id: '',
        trabajador_id: '',
        fecha_reserva: '',
        hora_reserva: '',
        ubicacion_gps: ''
      });
      fetchReservas();
    } catch (error) {
      console.error('Error adding manual appointment:', error);
      alert('Error al agregar cita manual');
    } finally {
      setIsSubmitting(false);
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

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let firstDayOfMonth = new Date(year, month, 1).getDay();
  firstDayOfMonth = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const blanks = Array(firstDayOfMonth).fill(null);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const totalSlots = [...blanks, ...daysArray];

  // Agrupar eventos por fecha para mostrarlos en el calendario
  const eventsByDate = useMemo(() => {
    const grouped = {};
    events.forEach(ev => {
      if (!grouped[ev.dateStr]) grouped[ev.dateStr] = [];
      grouped[ev.dateStr].push(ev);
    });
    return grouped;
  }, [events]);

  const handleDayClick = (day) => {
    if (!day) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDateStr(dateStr);
  };

  const selectedDayEvents = selectedDateStr ? (eventsByDate[selectedDateStr] || []).sort((a, b) => a.time.localeCompare(b.time)) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <h2 className="text-h2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarIcon size={24} color="var(--accent-green)" /> Agenda Mensual
          </h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="btn-icon" onClick={prevMonth} style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '4px', cursor: 'pointer', color: 'var(--text-main)' }}>
              <ChevronLeft size={20} />
            </button>
            <span style={{ fontSize: '18px', fontWeight: '600', minWidth: '150px', textAlign: 'center' }}>
              {monthNames[month]} {year}
            </span>
            <button className="btn-icon" onClick={nextMonth} style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '4px', cursor: 'pointer', color: 'var(--text-main)' }}>
              <ChevronRight size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
             <button className="btn-primary" onClick={() => setShowManualModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <Plus size={16} /> Agregar Cita Manual
             </button>
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
          <div className="table-responsive" style={{ overflowX: 'auto', paddingBottom: '8px' }}>
            <div style={{ minWidth: '640px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '8px' }}>
                {days.map(day => (
                  <div key={day} style={{ textAlign: 'center', fontWeight: '600', padding: '8px', backgroundColor: 'var(--card-bg)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    {day}
                  </div>
                ))}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                {totalSlots.map((day, index) => {
                  const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
                  const dayEvents = dateStr ? (eventsByDate[dateStr] || []) : [];
                  
                  return (
                    <div 
                      key={index} 
                      onClick={() => handleDayClick(day)}
                      style={{ 
                        minHeight: '100px', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: 'var(--radius-sm)', 
                        backgroundColor: day ? 'var(--bg-color)' : 'transparent',
                        padding: '8px',
                        cursor: day ? 'pointer' : 'default',
                        opacity: day ? 1 : 0.5,
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (day) e.currentTarget.style.borderColor = 'var(--accent-green)';
                      }}
                      onMouseLeave={(e) => {
                        if (day) e.currentTarget.style.borderColor = 'var(--border-color)';
                      }}
                    >
                      {day && (
                        <>
                          <div style={{ fontWeight: '600', marginBottom: '8px', textAlign: 'right', color: 'var(--text-muted)' }}>
                            {day}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {dayEvents.slice(0, 3).map(ev => (
                              <div key={ev.id} style={{ 
                                fontSize: '11px', 
                                padding: '4px', 
                                borderRadius: '4px', 
                                backgroundColor: 'var(--card-bg)',
                                borderLeft: `3px solid ${getStatusColor(ev.status)}`,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {ev.time} - {ev.title}
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>
                                +{dayEvents.length - 3} más
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedDateStr && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '24px' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', padding: '24px', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <div>
                <h2 className="text-h2">Agenda del Día</h2>
                <p className="text-muted" style={{ marginTop: '4px' }}>
                  {new Date(`${selectedDateStr}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setSelectedDateStr(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '8px', borderRadius: '50%', backgroundColor: 'var(--bg-color)' }}><X size={20} /></button>
            </div>
            
            {selectedDayEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No hay servicios agendados para este día.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {selectedDayEvents.map(ev => (
                  <div key={ev.id} style={{ 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px', 
                    padding: '16px',
                    borderLeft: `4px solid ${getStatusColor(ev.status)}`,
                    backgroundColor: 'var(--bg-color)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={18} color="var(--accent-green)" />
                        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{ev.time}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {ev.paymentStatus === 'PAGADO' && (
                          <div style={{ color: '#10b981', fontWeight: 'bold', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            ✅ Pagado {ev.paymentMethod === 'QR' ? 'QR' : 'Efectivo'}
                          </div>
                        )}
                        <div style={{ color: getStatusColor(ev.status), fontWeight: '600', backgroundColor: 'var(--card-bg)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                          {ev.status}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={16} color="var(--text-muted)" />
                        <span className="text-body">{ev.title}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={16} color="var(--text-muted)" />
                        <span className="text-body">{ev.customer}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Car size={16} color="var(--text-muted)" />
                        <span className="text-body">{ev.car}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UserCheck size={16} color="var(--text-muted)" />
                        <span className="text-body">{ev.worker}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', gridColumn: '1 / -1', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--accent-green)' }}>Bs.{ev.price}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showManualModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '24px' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', padding: '24px', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '500px', boxShadow: 'var(--shadow-soft)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 className="text-h2">Agregar Cita Manualmente</h2>
              <button onClick={() => setShowManualModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="text-body" style={{ display: 'block', marginBottom: '4px' }}>Nombre del Cliente</label>
                <input type="text" required className="form-input" value={manualForm.cliente_nombre} onChange={e => setManualForm({...manualForm, cliente_nombre: e.target.value})} style={{ width: '100%' }} />
              </div>
              
              <div>
                <label className="text-body" style={{ display: 'block', marginBottom: '4px' }}>Vehículo (Marca, Modelo, Placa)</label>
                <input type="text" required className="form-input" value={manualForm.vehiculo} onChange={e => setManualForm({...manualForm, vehiculo: e.target.value})} style={{ width: '100%' }} />
              </div>
              
              <div>
                <label className="text-body" style={{ display: 'block', marginBottom: '4px' }}>Servicio</label>
                <select required className="form-input" value={manualForm.servicio_id} onChange={e => setManualForm({...manualForm, servicio_id: e.target.value})} style={{ width: '100%' }}>
                  <option value="">Seleccione un servicio</option>
                  {serviciosList.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-body" style={{ display: 'block', marginBottom: '4px' }}>Trabajador Asignado (Opcional)</label>
                <select className="form-input" value={manualForm.trabajador_id} onChange={e => setManualForm({...manualForm, trabajador_id: e.target.value})} style={{ width: '100%' }}>
                  <option value="">Sin asignar</option>
                  {trabajadoresList.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="text-body" style={{ display: 'block', marginBottom: '4px' }}>Fecha</label>
                  <input type="date" min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]} required className="form-input" value={manualForm.fecha_reserva} onChange={e => setManualForm({...manualForm, fecha_reserva: e.target.value})} style={{ width: '100%' }} />
                </div>
                <div>
                  <label className="text-body" style={{ display: 'block', marginBottom: '4px' }}>Hora</label>
                  <input type="time" required className="form-input" value={manualForm.hora_reserva} onChange={e => setManualForm({...manualForm, hora_reserva: e.target.value})} style={{ width: '100%' }} />
                </div>
              </div>

              <div>
                <label className="text-body" style={{ display: 'block', marginBottom: '4px' }}>Ubicación (Coordenadas o Dirección)</label>
                <input type="text" className="form-input" placeholder="Ej: Av. Principal 123 o -16.5, -68.1" value={manualForm.ubicacion_gps} onChange={e => setManualForm({...manualForm, ubicacion_gps: e.target.value})} style={{ width: '100%' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowManualModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : 'Guardar Cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, X, MapPin, Car, User, UserCheck, Database, ChevronLeft, ChevronRight, Plus, Edit3 } from 'lucide-react';
import { supabase } from '../supabase';
import { autoAssignWorker } from '../utils/autoAssignWorker';
import { getMapUrls } from '../utils/navigationUrls';
import { MapContainer, TileLayer, Marker, useMapEvents, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });
  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function Citas() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDateStr, setSelectedDateStr] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [trabajadoresList, setTrabajadoresList] = useState([]);
  const [serviciosList, setServiciosList] = useState([]);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapPosition, setMapPosition] = useState({ lat: -17.7833, lng: -63.1821 });
  const [zonasCobertura, setZonasCobertura] = useState([]);
  const [manualForm, setManualForm] = useState({
    cliente_nombre: '',
    vehiculo: '',
    servicio_id: '',
    trabajador_id: '',
    fecha_reserva: '',
    hora_reserva: '',
    ubicacion_gps: ''
  });
  const [disponibilidadFechas, setDisponibilidadFechas] = useState([]);
  const [showDispoModal, setShowDispoModal] = useState(false);
  const [dispoForm, setDispoForm] = useState({
    tipo: 'rango',
    slots: [],
    hora_inicio: '08:00',
    hora_fin: '18:00',
    cerrado: false,
    capacidad_por_slot: 1
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editForm, setEditForm] = useState({
    cliente_nombre: '',
    vehiculo: '',
    servicio_id: '',
    trabajador_id: '',
    fecha_reserva: '',
    hora_reserva: '',
    precio_total: 0,
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
    const [resReservas, resTrabajadores, resServicios, resDispo, resZonas] = await Promise.all([
      supabase.from('reservas').select('*').order('fecha_reserva', { ascending: true }),
      supabase.from('trabajadores').select('id, nombre'),
      supabase.from('servicios').select('id, nombre, precio'),
      supabase.from('disponibilidad_fechas').select('*'),
      supabase.from('zonas_cobertura').select('*')
    ]);
      
    if (resReservas.error) {
      console.error('Error fetching reservas:', resReservas.error);
    } else {
      const tList = resTrabajadores.data || [];
      const sList = resServicios.data || [];
      setTrabajadoresList(tList);
      setServiciosList(sList);
      setDisponibilidadFechas(resDispo.data || []);
      if (resZonas && resZonas.data) {
        setZonasCobertura(resZonas.data);
      }
      
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
          paymentStatus: res.payment_status,
          servicio_id: res.servicio_id,
          trabajador_id: res.trabajador_id || res.empleado_id,
          raw: res
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

  const openDispoModal = (dateStr) => {
    const existing = disponibilidadFechas.find(d => d.fecha === dateStr);
    if (existing) {
      setDispoForm({
        tipo: existing.tipo || 'rango',
        slots: existing.slots || [],
        hora_inicio: existing.hora_inicio ? existing.hora_inicio.substring(0, 5) : '08:00',
        hora_fin: existing.hora_fin ? existing.hora_fin.substring(0, 5) : '18:00',
        cerrado: existing.cerrado || false,
        capacidad_por_slot: existing.capacidad_por_slot ? parseInt(existing.capacidad_por_slot, 10) : 1
      });
    } else {
      setDispoForm({
        tipo: 'rango',
        slots: [],
        hora_inicio: '08:00',
        hora_fin: '18:00',
        cerrado: false,
        capacidad_por_slot: 1
      });
    }
    setShowDispoModal(true);
  };

  const handleSaveDispo = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        fecha: selectedDateStr,
        tipo: dispoForm.tipo,
        slots: dispoForm.slots,
        hora_inicio: dispoForm.hora_inicio + ':00',
        hora_fin: dispoForm.hora_fin + ':00',
        cerrado: dispoForm.cerrado,
        capacidad_por_slot: parseInt(dispoForm.capacidad_por_slot, 10) || 1
      };
      
      const { error } = await supabase
        .from('disponibilidad_fechas')
        .upsert(payload, { onConflict: 'fecha' });
        
      if (error) throw error;
      
      alert('Horario configurado exitosamente');
      setShowDispoModal(false);
      const { data } = await supabase.from('disponibilidad_fechas').select('*');
      setDisponibilidadFechas(data || []);
    } catch (err) {
      alert('Error guardando horario: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (ev) => {
    const raw = ev.raw || {};
    let sId = ev.servicio_id || raw.servicio_id || '';
    if (!sId) {
      const match = serviciosList.find(s => s.nombre === ev.title);
      if (match) sId = match.id;
    }

    let wId = ev.trabajador_id || raw.trabajador_id || raw.empleado_id || '';
    if (!wId) {
      const matchW = trabajadoresList.find(t => t.nombre === ev.worker);
      if (matchW) wId = matchW.id;
    }

    setEditingEvent(ev);
    setEditForm({
      cliente_nombre: ev.customer || raw.cliente_nombre || '',
      vehiculo: ev.car || raw.vehiculo || '',
      servicio_id: sId,
      trabajador_id: wId,
      fecha_reserva: ev.dateStr || raw.fecha_reserva || '',
      hora_reserva: ev.time || (raw.hora_reserva ? raw.hora_reserva.substring(0, 5) : '08:30'),
      precio_total: ev.price ?? raw.precio_total ?? 0,
      ubicacion_gps: raw.ubicacion_gps || ''
    });
    setShowEditModal(true);
  };

  const handleEditServiceChange = (newServiceId) => {
    const selectedService = serviciosList.find(s => s.id === newServiceId);
    setEditForm(prev => ({
      ...prev,
      servicio_id: newServiceId,
      precio_total: selectedService ? selectedService.precio : prev.precio_total
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingEvent) return;
    setIsSubmitting(true);
    try {
      if (!editForm.hora_reserva) {
        alert('Por favor selecciona una hora para la cita.');
        setIsSubmitting(false);
        return;
      }
      if (!editForm.vehiculo.trim()) {
        alert('Por favor ingresa los datos del vehículo.');
        setIsSubmitting(false);
        return;
      }
      if (!editForm.servicio_id) {
        alert('Por favor selecciona un servicio.');
        setIsSubmitting(false);
        return;
      }

      const formattedHora = editForm.hora_reserva.length === 5 
        ? `${editForm.hora_reserva}:00` 
        : editForm.hora_reserva;

      const updatePayload = {
        vehiculo: editForm.vehiculo.trim(),
        servicio_id: editForm.servicio_id,
        fecha_reserva: editForm.fecha_reserva,
        hora_reserva: formattedHora,
        precio_total: parseFloat(editForm.precio_total) || 0,
        trabajador_id: editForm.trabajador_id || null
      };

      const { error } = await supabase
        .from('reservas')
        .update(updatePayload)
        .eq('id', editingEvent.id);

      if (error) throw error;

      alert('✅ Cita actualizada exitosamente');
      setShowEditModal(false);
      setEditingEvent(null);
      await fetchReservas();

      if (editForm.fecha_reserva && editForm.fecha_reserva !== selectedDateStr) {
        setSelectedDateStr(editForm.fecha_reserva);
      }
    } catch (err) {
      console.error('Error al actualizar la cita:', err);
      alert('Error al actualizar la cita: ' + err.message);
    } finally {
      setIsSubmitting(false);
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
        estado_reserva: finalTrabajadorId ? 'asignado' : 'pendiente',
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
                  const dispoDay = dateStr ? disponibilidadFechas.find(d => d.fecha === dateStr) : null;
                  
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
                        display: 'flex',
                        flexDirection: 'column'
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div>
                              {dispoDay && (
                                <div style={{ fontSize: '10px' }}>
                                  {dispoDay.cerrado ? (
                                    <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>Cerrado</span>
                                  ) : dispoDay.tipo === 'slots' ? (
                                    <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>Slots ({dispoDay.slots ? dispoDay.slots.length : 0}) • Cap: {dispoDay.capacidad_por_slot || 1}</span>
                                  ) : (
                                    <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>Rango</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div style={{ fontWeight: '600', color: 'var(--text-muted)' }}>
                              {day}
                            </div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
                  <p className="text-muted">
                    {new Date(`${selectedDateStr}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <button 
                    onClick={() => openDispoModal(selectedDateStr)}
                    className="btn btn-outline"
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                  >
                    <Clock size={14} style={{ marginRight: '4px' }} />
                    Configurar Horario
                  </button>
                </div>
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
                      {(ev.raw?.ubicacion_gps || ev.raw?.ubicacion) && (() => {
                        const mapInfo = getMapUrls(ev.raw.ubicacion_gps || ev.raw.ubicacion);
                        return (
                          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--card-bg)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', marginTop: '4px', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '320px' }}>
                              <MapPin size={15} color="#ef4444" />
                              <span style={{ color: 'var(--text-muted)' }}>{ev.raw.ubicacion_gps || ev.raw.ubicacion}</span>
                            </div>
                            {mapInfo.hasLocation && (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <a
                                  href={mapInfo.googleMapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ padding: '4px 8px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: 'bold' }}
                                >
                                  📍 Google Maps
                                </a>
                                <a
                                  href={mapInfo.wazeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ padding: '4px 8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: 'bold' }}
                                >
                                  🚗 Waze
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', gridColumn: '1 / -1', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--accent-green)' }}>Bs.{ev.price}</span>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(ev)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            backgroundColor: 'rgba(59, 130, 246, 0.08)',
                            border: '1px solid var(--accent-blue)',
                            color: 'var(--accent-blue)',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.08)';
                          }}
                        >
                          <Edit3 size={14} /> Editar Cita
                        </button>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="text-body" style={{ fontWeight: '500' }}>Ubicación (Coordenadas o Dirección)</label>
                  <button
                    type="button"
                    onClick={() => {
                      const match = manualForm.ubicacion_gps ? manualForm.ubicacion_gps.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/) : null;
                      if (match) {
                        setMapPosition({ lat: parseFloat(match[1]), lng: parseFloat(match[2]) });
                      }
                      setShowMapModal(true);
                    }}
                    style={{
                      padding: '4px 10px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid #3b82f6',
                      color: '#3b82f6',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    🗺️ Elegir en Mapa
                  </button>
                </div>
                <input type="text" className="form-input" placeholder="Ej: Av. Principal 123 o -17.78, -63.18" value={manualForm.ubicacion_gps} onChange={e => setManualForm({...manualForm, ubicacion_gps: e.target.value})} style={{ width: '100%' }} />
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

      {showDispoModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '24px' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', padding: '24px', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 className="text-h2">Horario Especial</h2>
              <button onClick={() => setShowDispoModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSaveDispo} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', backgroundColor: 'var(--bg-color)', borderRadius: '8px' }}>
                <input 
                  type="checkbox" 
                  id="cerradoCheck"
                  checked={dispoForm.cerrado} 
                  onChange={e => setDispoForm({...dispoForm, cerrado: e.target.checked})} 
                />
                <label htmlFor="cerradoCheck" className="text-body" style={{ fontWeight: 'bold' }}>Marcar este día como CERRADO</label>
              </div>
              
              {!dispoForm.cerrado && (
                <>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="radio" name="tipoHorario" checked={dispoForm.tipo === 'rango'} onChange={() => setDispoForm({...dispoForm, tipo: 'rango'})} />
                      Rango de Horas
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="radio" name="tipoHorario" checked={dispoForm.tipo === 'slots'} onChange={() => setDispoForm({...dispoForm, tipo: 'slots'})} />
                      Horarios Específicos (Slots)
                    </label>
                  </div>

                  {dispoForm.tipo === 'rango' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label className="text-body" style={{ display: 'block', marginBottom: '4px' }}>Hora Inicio</label>
                        <input type="time" required className="form-input" value={dispoForm.hora_inicio} onChange={e => setDispoForm({...dispoForm, hora_inicio: e.target.value})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label className="text-body" style={{ display: 'block', marginBottom: '4px' }}>Hora Fin</label>
                        <input type="time" required className="form-input" value={dispoForm.hora_fin} onChange={e => setDispoForm({...dispoForm, hora_fin: e.target.value})} style={{ width: '100%' }} />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-body" style={{ display: 'block', marginBottom: '8px' }}>Horarios Disponibles (Ej: 08:30)</label>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <input type="time" id="newSlotInput" className="form-input" style={{ flex: 1 }} />
                        <button type="button" className="btn btn-outline" onClick={() => {
                          const val = document.getElementById('newSlotInput').value;
                          if (val && !dispoForm.slots.includes(val)) {
                            setDispoForm({...dispoForm, slots: [...dispoForm.slots, val].sort()});
                            document.getElementById('newSlotInput').value = '';
                          }
                        }}>Agregar</button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                        {dispoForm.slots.map(slot => (
                          <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--accent-blue)', color: 'white', padding: '4px 12px', borderRadius: '16px', fontSize: '14px' }}>
                            {slot}
                            <button type="button" onClick={() => setDispoForm({...dispoForm, slots: dispoForm.slots.filter(s => s !== slot)})} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={14} /></button>
                          </div>
                        ))}
                        {dispoForm.slots.length === 0 && <span className="text-muted" style={{ fontSize: '13px' }}>No hay horarios agregados.</span>}
                      </div>

                      <div style={{ padding: '12px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <label className="text-body" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>
                          👥 Capacidad por Slot / Turno
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                          {[1, 2, 3].map(num => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setDispoForm({...dispoForm, capacidad_por_slot: num})}
                              style={{
                                padding: '8px 4px',
                                borderRadius: '6px',
                                border: (dispoForm.capacidad_por_slot === num) ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                                backgroundColor: (dispoForm.capacidad_por_slot === num) ? 'rgba(59, 130, 246, 0.15)' : 'var(--card-bg)',
                                color: (dispoForm.capacidad_por_slot === num) ? '#3b82f6' : 'var(--text-main)',
                                fontWeight: (dispoForm.capacidad_por_slot === num) ? 'bold' : 'normal',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '2px',
                                transition: 'all 0.2s'
                              }}
                            >
                              <span style={{ fontSize: '13px' }}>{num} {num === 1 ? 'Persona' : 'Personas'}</span>
                              <span style={{ fontSize: '10px', opacity: 0.75 }}>{num === 1 ? '(Por defecto)' : `(Hasta ${num} clientes)`}</span>
                            </button>
                          ))}
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', marginBottom: 0 }}>
                          Controla cuántos clientes o reservas pueden agendarse simultáneamente en un mismo turno específico.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
              
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowDispoModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : 'Guardar Horario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMapModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', width: '100%', maxWidth: '500px', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)' }}>📍 Mueve el pin a tu ubicación</h3>
              <button onClick={() => setShowMapModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ height: '350px', width: '100%' }}>
              <MapContainer center={[mapPosition.lat, mapPosition.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                {zonasCobertura.map(zona => {
                  if (!zona.coordenadas || !Array.isArray(zona.coordenadas) || zona.coordenadas.length === 0) return null;
                  const positions = zona.coordenadas.map(c => [c.lat, c.lng]);
                  return (
                    <Polygon 
                      key={zona.id} 
                      positions={positions} 
                      pathOptions={{ 
                        color: zona.color || '#1ca9c9', 
                        fillColor: zona.color || '#1ca9c9', 
                        fillOpacity: 0.2, 
                        weight: 2 
                      }} 
                    />
                  );
                })}
                <LocationMarker position={mapPosition} setPosition={setMapPosition} />
              </MapContainer>
            </div>
            <div style={{ padding: '16px', display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)' }}>
              <button type="button" onClick={() => setShowMapModal(false)} className="btn-secondary" style={{ padding: '10px 16px', borderRadius: '8px' }}>
                Cancelar
              </button>
              <button type="button" onClick={() => {
                setManualForm(prev => ({ ...prev, ubicacion_gps: `${mapPosition.lat.toFixed(6)}, ${mapPosition.lng.toFixed(6)}` }));
                setShowMapModal(false);
              }} className="btn-primary" style={{ padding: '10px 16px', borderRadius: '8px' }}>
                Confirmar Ubicación
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200, padding: '24px' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', padding: '24px', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '540px', boxShadow: 'var(--shadow-soft)', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h2 className="text-h2" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Edit3 size={20} color="var(--accent-blue)" /> Editar Cita
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Cliente: <strong style={{ color: 'var(--text-main)' }}>{editForm.cliente_nombre || 'No registrado'}</strong>
                </p>
              </div>
              <button 
                onClick={() => { setShowEditModal(false); setEditingEvent(null); }} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Servicio */}
              <div>
                <label className="text-body" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  🧼 Servicio
                </label>
                <select 
                  required 
                  className="form-input" 
                  value={editForm.servicio_id} 
                  onChange={e => handleEditServiceChange(e.target.value)} 
                  style={{ width: '100%', padding: '10px 12px' }}
                >
                  <option value="">Seleccione un servicio</option>
                  {serviciosList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} — Bs. {s.precio}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehículo */}
              <div>
                <label className="text-body" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  🚗 Vehículo (Marca, Modelo, Tipo)
                </label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  placeholder="Ej: Suzuki Grand Vitara (SUV mediana)" 
                  value={editForm.vehiculo} 
                  onChange={e => setEditForm({...editForm, vehiculo: e.target.value})} 
                  style={{ width: '100%', padding: '10px 12px' }} 
                />
              </div>

              {/* Fecha y Hora */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="text-body" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    📅 Fecha de la Cita
                  </label>
                  <input 
                    type="date" 
                    required 
                    className="form-input" 
                    value={editForm.fecha_reserva} 
                    onChange={e => setEditForm({...editForm, fecha_reserva: e.target.value})} 
                    style={{ width: '100%', padding: '10px 12px' }} 
                  />
                </div>
                <div>
                  <label className="text-body" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    ⏰ Hora de la Cita
                  </label>
                  <input 
                    type="time" 
                    required 
                    className="form-input" 
                    value={editForm.hora_reserva} 
                    onChange={e => setEditForm({...editForm, hora_reserva: e.target.value})} 
                    style={{ width: '100%', padding: '10px 12px' }} 
                  />
                </div>
              </div>

              {/* Atajos rápidos de turnos */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  ⚡ Turnos habituales rápidos:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {['08:30', '10:30', '13:30', '15:00', '15:30', '17:00'].map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, hora_reserva: slot }))}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '16px',
                        border: editForm.hora_reserva === slot ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                        backgroundColor: editForm.hora_reserva === slot ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-color)',
                        color: editForm.hora_reserva === slot ? 'var(--accent-blue)' : 'var(--text-muted)',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Precio Total y Trabajador */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="text-body" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    💰 Precio Total (Bs.)
                  </label>
                  <input 
                    type="number" 
                    step="any"
                    required 
                    className="form-input" 
                    value={editForm.precio_total} 
                    onChange={e => setEditForm({...editForm, precio_total: e.target.value})} 
                    style={{ width: '100%', padding: '10px 12px' }} 
                  />
                </div>
                <div>
                  <label className="text-body" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    👷 Trabajador Asignado
                  </label>
                  <select 
                    className="form-input" 
                    value={editForm.trabajador_id} 
                    onChange={e => setEditForm({...editForm, trabajador_id: e.target.value})} 
                    style={{ width: '100%', padding: '10px 12px' }}
                  >
                    <option value="">Sin asignar</option>
                    {trabajadoresList.map(t => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Botones de acción */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => { setShowEditModal(false); setEditingEvent(null); }}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={isSubmitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {isSubmitting ? 'Guardando Cambios...' : '💾 Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, Map, Banknote, X, Calendar, DollarSign, TrendingUp, Filter, Trash2, Search, Eye } from 'lucide-react';
import { supabase } from '../supabase';
import KpiCards from './KpiCards';
import PipelineChart from './PipelineChart';
import SalesTrendChart from './SalesTrendChart';
import TopDeals from './TopDeals';
import OrderDetailsModal from './OrderDetailsModal';

export default function Dashboard() {
  const navigate = useNavigate();
  const [showFinanzasModal, setShowFinanzasModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [promos, setPromos] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  useEffect(() => {
    fetchPromos();
    fetchReservas();
    fetchServicios();
    fetchTrabajadores();
  }, []);

  const fetchPromos = async () => {
    const { data, error } = await supabase.from('promociones').select('*');
    if (!error && data) {
      setPromos(data);
    }
  };

  const fetchReservas = async () => {
    const { data, error } = await supabase.from('reservas').select('*');
    if (!error && data) {
      setReservas(data);
    }
  };

  const fetchServicios = async () => {
    const { data, error } = await supabase.from('servicios').select('*');
    if (!error && data) setServicios(data);
  };

  const fetchTrabajadores = async () => {
    const { data, error } = await supabase.from('trabajadores').select('*');
    if (!error && data) setTrabajadores(data);
  };

  const deleteReserva = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este servicio? Esto reducirá el monto de ingresos y borrará el historial de esta prueba.")) return;
    
    const { error } = await supabase.from('reservas').delete().eq('id', id);
    if (error) {
      alert("Error al eliminar el servicio: " + error.message);
      console.error(error);
    } else {
      setReservas(prev => prev.filter(r => r.id !== id));
    }
  };

  // Calculate KPIs
  const kpis = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // Filtros de fecha básicos
    const todayReservas = reservas.filter(r => String(r.fecha_reserva || r.created_at || '').split('T')[0] === today);
    const thisMonth = new Date().toISOString().substring(0, 7);
    const monthReservas = reservas.filter(r => (r.fecha_reserva || r.created_at)?.startsWith(thisMonth));
    
    // Semana actual (aproximación)
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekReservas = reservas.filter(r => {
      const d = new Date(r.fecha_reserva || r.created_at);
      return d >= oneWeekAgo && d <= now;
    });

    const sumIngresos = (arr) => arr.filter(r => r.estado !== 'Cancelado').reduce((sum, r) => sum + (r.precio_total || 0), 0);

    return {
      ingresosDia: sumIngresos(todayReservas),
      ingresosSemana: sumIngresos(weekReservas),
      ingresosMes: sumIngresos(monthReservas),
      serviciosHoy: todayReservas.length
    };
  }, [reservas]);

  // Simulador de datos basado en la fecha seleccionada para el modal
  const finanzasDetalladas = useMemo(() => {
    const sumIngresos = (arr) => arr.filter(r => r.estado !== 'Cancelado').reduce((sum, r) => sum + (r.precio_total || 0), 0);
    
    const dayReservas = reservas.filter(r => String(r.fecha_reserva || r.created_at || '').split('T')[0] === selectedDate);
    
    const dDate = new Date(selectedDate);
    const oneWeekAgo = new Date(dDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekReservas = reservas.filter(r => {
      const d = new Date(r.fecha_reserva || r.created_at || new Date());
      return d >= oneWeekAgo && d <= dDate;
    });

    const monthStr = selectedDate.substring(0, 7);
    const monthReservas = reservas.filter(r => String(r.fecha_reserva || r.created_at || '').startsWith(monthStr));

    return {
      dia: sumIngresos(dayReservas),
      semana: sumIngresos(weekReservas),
      mes: sumIngresos(monthReservas),
      diaServicios: dayReservas,
      semanaServicios: weekReservas,
      mesServicios: monthReservas
    };
  }, [selectedDate, reservas]);

  const [filtroActivo, setFiltroActivo] = useState('dia');
  const [filtroTexto, setFiltroTexto] = useState('');

  const serviciosFiltrados = (filtroActivo === 'dia' ? finanzasDetalladas.diaServicios :
                              filtroActivo === 'semana' ? finanzasDetalladas.semanaServicios :
                              finanzasDetalladas.mesServicios).filter(s => {
    if (!filtroTexto) return true;
    const text = filtroTexto.toLowerCase();
    const cliente = (s.cliente_nombre || s.cliente || '').toLowerCase();
    const servicioName = (servicios.find(svc => svc.id === s.servicio_id)?.nombre || s.servicio || '').toLowerCase();
    const trabajador = (trabajadores.find(t => t.id === s.trabajador_id)?.nombre || s.trabajador_nombre || '').toLowerCase();
    return cliente.includes(text) || servicioName.includes(text) || trabajador.includes(text);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div className="welcome-section">
        <div>
          <h1 className="text-h1">Hola, Admin 👋</h1>
          <p className="text-body text-muted" style={{ marginTop: '4px' }}>Aquí tienes el resumen de Lavamóvil Norte para hoy.</p>
        </div>
        <div className="welcome-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => setShowFinanzasModal(true)} style={{ backgroundColor: 'var(--accent-green)', color: '#000' }}>
            <Banknote size={18} /> Ver Ingresos Detallados
          </button>
          <button className="btn-secondary" onClick={() => navigate('/citas')}>
            <CalendarCheck size={18} /> Agendar Cita
          </button>
          <button className="btn-secondary" onClick={() => navigate('/zonas')}>
            <Map size={18} /> Ver Ruta del Día
          </button>
        </div>
      </div>

      <div className="card">
        <div className="chart-header">
          <h2 className="text-h2">Visión General del Rendimiento</h2>
        </div>
        <KpiCards kpis={kpis} onCardClick={(type) => { setFiltroActivo(type); setShowFinanzasModal(true); }} />
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="chart-header">
            <div>
              <h2 className="text-h2">Valor por Estado de Reserva</h2>
              <p className="text-body text-muted" style={{ marginTop: '4px' }}>Servicios activos distribuidos por estado</p>
            </div>
          </div>
          <PipelineChart reservas={reservas} />
        </div>

        <div className="card">
          <div className="chart-header">
             <h2 className="text-h2">Mejores Promos</h2>
          </div>
          <TopDeals promos={promos} />
        </div>
      </div>
      
      <div className="card" style={{ marginTop: '0px' }}>
          <div className="chart-header">
             <h2 className="text-h2">Tendencia de Ventas (Ingresos en el tiempo)</h2>
          </div>
          <SalesTrendChart reservas={reservas} />
      </div>

      {/* Modal de Ingresos Detallados */}
      {showFinanzasModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-color)', padding: '0', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '900px', boxShadow: 'var(--shadow-lg)', maxHeight: '92vh', overflowY: 'auto', border: '1px solid var(--border-color)' }}>
            
            {/* Header del Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
              <div>
                <h2 className="text-h2" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', borderRadius: '8px' }}>
                    <Banknote size={24} />
                  </div>
                  Reporte Detallado de Ingresos
                </h2>
                <p className="text-muted" style={{ fontSize: '13px', marginTop: '4px' }}>Desglose financiero por fecha seleccionada</p>
              </div>
              <button onClick={() => setShowFinanzasModal(false)} style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: '20px' }}>
              {/* Selector de Fecha */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', backgroundColor: 'var(--card-bg)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Calendar size={20} className="text-muted" />
                  <span style={{ fontWeight: '500', fontSize: '14px' }}>Seleccionar Fecha:</span>
                </div>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '14px', fontWeight: '500', outline: 'none' }}
                />
              </div>

              {/* Tarjetas de Métricas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <div 
                  onClick={() => setFiltroActivo('dia')}
                  style={{ backgroundColor: filtroActivo === 'dia' ? 'var(--card-bg)' : 'transparent', padding: '18px', borderRadius: 'var(--radius-md)', border: `1px solid ${filtroActivo === 'dia' ? 'var(--accent-green)' : 'var(--border-color)'}`, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px' }}>Ingresos del Día</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)' }}>Bs {finanzasDetalladas.dia.toLocaleString()}</div>
                </div>
                
                <div 
                  onClick={() => setFiltroActivo('semana')}
                  style={{ backgroundColor: filtroActivo === 'semana' ? 'var(--card-bg)' : 'transparent', padding: '18px', borderRadius: 'var(--radius-md)', border: `1px solid ${filtroActivo === 'semana' ? 'var(--accent-green)' : 'var(--border-color)'}`, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px' }}>Ingresos de la Semana</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)' }}>Bs {finanzasDetalladas.semana.toLocaleString()}</div>
                </div>

                <div 
                  onClick={() => setFiltroActivo('mes')}
                  style={{ backgroundColor: filtroActivo === 'mes' ? 'var(--card-bg)' : 'transparent', padding: '18px', borderRadius: 'var(--radius-md)', border: `1px solid ${filtroActivo === 'mes' ? 'var(--accent-green)' : 'var(--border-color)'}`, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px' }}>Ingresos del Mes</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)' }}>Bs {finanzasDetalladas.mes.toLocaleString()}</div>
                </div>
              </div>

              {/* Tabla Detallada */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600' }}>
                    Servicios Completados {filtroActivo === 'dia' ? 'este Día' : filtroActivo === 'semana' ? 'esta Semana' : 'este Mes'}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 12px' }}>
                    <Search size={14} className="text-muted" />
                    <input 
                      type="text" 
                      placeholder="Buscar cliente o servicio..." 
                      value={filtroTexto}
                      onChange={(e) => setFiltroTexto(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', color: 'var(--text-main)', width: '160px' }}
                    />
                  </div>
                </div>
                
                <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Hora</th>
                        <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Cliente</th>
                        <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Trabajador</th>
                        <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Servicio Realizado</th>
                        <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Método</th>
                        <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'right' }}>Monto</th>
                        <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviciosFiltrados.map((s, i) => (
                        <tr key={s.id} style={{ borderBottom: i === serviciosFiltrados.length - 1 ? 'none' : '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
                          <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-muted)' }}>{String(s.hora_reserva || s.hora || '').substring(0, 5)}</td>
                          <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500' }}>{s.cliente_nombre || s.cliente}</td>
                          <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-muted)' }}>{trabajadores.find(t => t.id === s.trabajador_id)?.nombre || s.trabajador_nombre || '-'}</td>
                          <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                            <span style={{ display: 'inline-block', padding: '4px 8px', backgroundColor: 'rgba(28, 169, 201, 0.1)', color: 'var(--accent-cyan)', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                              {servicios.find(svc => svc.id === s.servicio_id)?.nombre || s.servicio || '-'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-muted)' }}>
                            {s.payment_status === 'PAGADO' ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', fontWeight: '600' }}>
                                ✅ {s.payment_method === 'QR' ? 'QR' : 'Efectivo'}
                              </span>
                            ) : (
                              'Sin pago'
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '15px', fontWeight: '700', textAlign: 'right', color: 'var(--accent-green)' }}>
                            Bs {s.precio_total || s.precio}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              <button 
                                onClick={() => setSelectedOrder(s)} 
                                style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', transition: 'all 0.2s' }} 
                                title="Ver Detalles"
                                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(28, 169, 201, 0.1)'; }}
                                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                              >
                                <Eye size={18} />
                              </button>
                              <button 
                                onClick={() => deleteReserva(s.id)} 
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', transition: 'all 0.2s' }} 
                                title="Eliminar registro"
                                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; }}
                                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal Detalles del Servicio */}
      {selectedOrder && (
        <OrderDetailsModal 
          reserva={selectedOrder} 
          servicios={servicios} 
          onClose={() => setSelectedOrder(null)} 
        />
      )}

    </div>
  );
}

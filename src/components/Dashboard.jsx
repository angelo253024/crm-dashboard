import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, Map, Banknote, X, Calendar, DollarSign, TrendingUp, Filter } from 'lucide-react';
import { supabase } from '../supabase';
import KpiCards from './KpiCards';
import PipelineChart from './PipelineChart';
import SalesTrendChart from './SalesTrendChart';
import TopDeals from './TopDeals';
import MotoDashboard from './MotoDashboard';

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const [showFinanzasModal, setShowFinanzasModal] = useState(false);
  const [showFiltrosTabla, setShowFiltrosTabla] = useState(false);
  const [tablaSearch, setTablaSearch] = useState('');
  const [tablaServicioFilter, setTablaServicioFilter] = useState('todos');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [promos, setPromos] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [selectedTrabajador, setSelectedTrabajador] = useState('todos');
  
  useEffect(() => {
    fetchPromos();
    fetchReservas();
    fetchTrabajadores();
  }, []);

  const fetchTrabajadores = async () => {
    const { data } = await supabase.from('trabajadores').select('id, nombre');
    if (data) setTrabajadores(data);
  };

  const fetchPromos = async () => {
    const { data, error } = await supabase.from('promociones').select('*');
    if (!error && data) {
      setPromos(data);
    }
  };

  const fetchReservas = async () => {
    const { data, error } = await supabase.from('reservas').select('*, trabajadores(nombre)');
    if (!error && data) {
      setReservas(data);
    }
  };

  // Calculate KPIs
  const kpis = useMemo(() => {
    let filteredReservas = reservas;
    if (selectedTrabajador !== 'todos') {
      filteredReservas = reservas.filter(r => r.trabajador_id === selectedTrabajador);
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    // Filtros de fecha básicos
    const todayReservas = filteredReservas.filter(r => (r.fecha_reserva || r.created_at?.split('T')[0]) === today);
    const thisMonth = new Date().toISOString().substring(0, 7);
    const monthReservas = filteredReservas.filter(r => (r.fecha_reserva || r.created_at)?.startsWith(thisMonth));
    
    // Semana actual (aproximación)
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekReservas = filteredReservas.filter(r => {
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
  }, [reservas, selectedTrabajador]);

  // Simulador de datos basado en la fecha seleccionada para el modal
  const finanzasDetalladas = useMemo(() => {
    let filteredReservas = reservas;
    if (selectedTrabajador !== 'todos') {
      filteredReservas = reservas.filter(r => r.trabajador_id === selectedTrabajador);
    }

    const sumIngresos = (arr) => arr.filter(r => r.estado !== 'Cancelado').reduce((sum, r) => sum + (r.precio_total || r.precio || 0), 0);
    
    const dayReservas = filteredReservas.filter(r => (r.fecha_reserva || r.created_at?.split('T')[0]) === selectedDate);
    
    const dDate = new Date(selectedDate);
    const oneWeekAgo = new Date(dDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekReservas = filteredReservas.filter(r => {
      const d = new Date(r.fecha_reserva || r.created_at);
      return d >= oneWeekAgo && d <= dDate;
    });

    const monthStr = selectedDate.substring(0, 7);
    const monthReservas = filteredReservas.filter(r => (r.fecha_reserva || r.created_at)?.startsWith(monthStr));

    return {
      dia: sumIngresos(dayReservas),
      semana: sumIngresos(weekReservas),
      mes: sumIngresos(monthReservas),
      dayReservas,
      weekReservas,
      monthReservas
    };
  }, [selectedDate, reservas, selectedTrabajador]);

  const [filtroActivo, setFiltroActivo] = useState('dia');

  const serviciosParaFiltro = useMemo(() => {
    let list = [];
    if (filtroActivo === 'dia') list = finanzasDetalladas.dayReservas;
    else if (filtroActivo === 'semana') list = finanzasDetalladas.weekReservas;
    else if (filtroActivo === 'mes') list = finanzasDetalladas.monthReservas;
    return list || [];
  }, [finanzasDetalladas, filtroActivo]);

  const uniqueServicios = useMemo(() => {
    const s = new Set(serviciosParaFiltro.map(x => x.servicio).filter(Boolean));
    return Array.from(s);
  }, [serviciosParaFiltro]);

  const serviciosMostrados = useMemo(() => {
    let list = [...serviciosParaFiltro];

    if (tablaSearch) {
      const search = tablaSearch.toLowerCase();
      list = list.filter(s => 
        (s.cliente_nombre || s.cliente || '').toLowerCase().includes(search) ||
        (s.trabajadores?.nombre || '').toLowerCase().includes(search)
      );
    }
    if (tablaServicioFilter !== 'todos') {
      list = list.filter(s => s.servicio === tablaServicioFilter);
    }
    return list;
  }, [serviciosParaFiltro, tablaSearch, tablaServicioFilter]);

  if (user && user.rol !== 'Administrador' && user.rol !== 'Admin') {
    return <MotoDashboard user={user} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div className="welcome-section">
        <div>
          <h1 className="text-h1">Hola, Admin 👋</h1>
          <p className="text-body text-muted" style={{ marginTop: '4px' }}>Aquí tienes el resumen de Lavamóvil Norte para hoy.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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

      <div className="card" style={{ padding: '32px' }}>
        <div className="chart-header">
          <h2 className="text-h2">Visión General del Rendimiento</h2>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <select 
            value={selectedTrabajador} 
            onChange={(e) => setSelectedTrabajador(e.target.value)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', outline: 'none' }}
          >
            <option value="todos">Todos los Trabajadores</option>
            {trabajadores.map(t => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'var(--bg-color)', padding: '0', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '900px', boxShadow: 'var(--shadow-lg)', maxHeight: '95vh', overflowY: 'auto', border: '1px solid var(--border-color)' }}>
            
            {/* Header del Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
              <div>
                <h2 className="text-h2" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', borderRadius: '8px' }}>
                    <Banknote size={24} />
                  </div>
                  Reporte Detallado de Ingresos
                </h2>
                <p className="text-muted" style={{ fontSize: '14px', marginTop: '4px' }}>Desglose financiero por fecha seleccionada</p>
              </div>
              <button onClick={() => { setShowFinanzasModal(false); setShowFiltrosTabla(false); }} style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: '32px' }}>
              {/* Selector de Fecha */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', backgroundColor: 'var(--card-bg)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Calendar size={20} className="text-muted" />
                  <span style={{ fontWeight: '500' }}>Seleccionar Fecha:</span>
                  <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '14px', fontWeight: '500', outline: 'none' }}
                  />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontWeight: '500' }}>Trabajador:</span>
                  <select 
                    value={selectedTrabajador} 
                    onChange={(e) => setSelectedTrabajador(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)', outline: 'none', fontSize: '14px' }}
                  >
                    <option value="todos">Todos</option>
                    {trabajadores.map(t => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tarjetas de Métricas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
                <div 
                  onClick={() => setFiltroActivo('dia')}
                  style={{ background: filtroActivo === 'dia' ? 'var(--card-bg)' : 'var(--bg-color)', padding: '24px', borderRadius: 'var(--radius-md)', border: `1px solid ${filtroActivo === 'dia' ? 'var(--accent-green)' : 'var(--border-color)'}`, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Ingresos del Día</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)' }}>Bs {finanzasDetalladas.dia.toLocaleString()}</div>
                </div>
                
                <div 
                  onClick={() => setFiltroActivo('semana')}
                  style={{ background: filtroActivo === 'semana' ? 'var(--card-bg)' : 'var(--bg-color)', padding: '24px', borderRadius: 'var(--radius-md)', border: `1px solid ${filtroActivo === 'semana' ? 'var(--accent-green)' : 'var(--border-color)'}`, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Ingresos de la Semana</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)' }}>Bs {finanzasDetalladas.semana.toLocaleString()}</div>
                </div>

                <div 
                  onClick={() => setFiltroActivo('mes')}
                  style={{ background: filtroActivo === 'mes' ? 'var(--card-bg)' : 'var(--bg-color)', padding: '24px', borderRadius: 'var(--radius-md)', border: `1px solid ${filtroActivo === 'mes' ? 'var(--accent-green)' : 'var(--border-color)'}`, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Ingresos del Mes</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)' }}>Bs {finanzasDetalladas.mes.toLocaleString()}</div>
                </div>
              </div>

              {/* Tabla Detallada */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', position: 'relative' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600' }}>
                    Servicios Completados {filtroActivo === 'dia' ? 'este Día' : filtroActivo === 'semana' ? 'esta Semana' : 'este Mes'}
                  </h3>
                  <button 
                    className="btn-secondary" 
                    onClick={() => setShowFiltrosTabla(!showFiltrosTabla)}
                    style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: showFiltrosTabla ? 'var(--card-bg)' : '' }}
                  >
                    <Filter size={14} /> Filtrar
                  </button>
                </div>
                
                {showFiltrosTabla && (
                  <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1', minWidth: '200px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600' }}>Buscar por Cliente o Trabajador</label>
                      <input 
                        type="text" 
                        value={tablaSearch}
                        onChange={(e) => setTablaSearch(e.target.value)}
                        placeholder="Ej. Juan, María..."
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '14px', outline: 'none' }}
                      />
                    </div>
                    <div style={{ flex: '1', minWidth: '200px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600' }}>Filtrar por Servicio</label>
                      <select 
                        value={tablaServicioFilter}
                        onChange={(e) => setTablaServicioFilter(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '14px', outline: 'none' }}
                      >
                        <option value="todos">Todos los servicios</option>
                        {uniqueServicios.map(serv => (
                          <option key={serv} value={serv}>{serv}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Hora</th>
                        <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Cliente</th>
                        <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Trabajador</th>
                        <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Servicio Realizado</th>
                        <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Método</th>
                        <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'right' }}>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviciosMostrados.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No se encontraron servicios que coincidan con los filtros.
                          </td>
                        </tr>
                      ) : (
                        serviciosMostrados.map((s, i) => (
                          <tr key={s.id} style={{ borderBottom: i === serviciosMostrados.length - 1 ? 'none' : '1px solid var(--border-color)', background: 'var(--bg-color)' }}>
                            <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-muted)' }}>{s.hora || (s.created_at ? new Date(s.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--')}</td>
                            <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500' }}>{s.cliente_nombre || s.cliente}</td>
                            <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-muted)' }}>{s.trabajadores?.nombre || 'Sin asignar'}</td>
                            <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                              <span style={{ display: 'inline-block', padding: '4px 8px', backgroundColor: 'rgba(28, 169, 201, 0.1)', color: 'var(--accent-cyan)', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                                {s.servicio}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-muted)' }}>Efectivo/QR</td>
                            <td style={{ padding: '12px 16px', fontSize: '15px', fontWeight: '700', textAlign: 'right', color: 'var(--accent-green)' }}>
                              Bs {s.precio_total || s.precio || 0}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

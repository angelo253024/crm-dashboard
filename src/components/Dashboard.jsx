import React, { useMemo, useState } from 'react';
import { CalendarCheck, Map, Banknote, X, Calendar, DollarSign, TrendingUp, Filter } from 'lucide-react';
import { deals, stages } from '../data/mockData';
import KpiCards from './KpiCards';
import PipelineChart from './PipelineChart';
import SalesTrendChart from './SalesTrendChart';
import TopDeals from './TopDeals';

export default function Dashboard() {
  const [showFinanzasModal, setShowFinanzasModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Calculate KPIs
  const kpis = useMemo(() => {
    // Simulando ingresos para el dashboard financiero principal
    return {
      ingresosDia: 1250,
      ingresosSemana: 8450,
      ingresosMes: 32450,
      serviciosHoy: 18
    };
  }, []);

  // Simulador de datos basado en la fecha seleccionada
  const finanzasDetalladas = useMemo(() => {
    // Generamos datos aleatorios creíbles basados en el string de la fecha para que sea "determinista" (cambie al cambiar fecha)
    const baseAmount = selectedDate.length > 0 ? (selectedDate.charCodeAt(selectedDate.length - 1) * 50) : 1000;
    
    return {
      dia: baseAmount + 850,
      semana: (baseAmount + 850) * 5.5,
      mes: (baseAmount + 850) * 22,
      servicios: [
        { id: '1', cliente: 'Carlos Mendoza', servicio: 'Lavado Premium', precio: 150, hora: '09:30 AM' },
        { id: '2', cliente: 'Flota Transporte', servicio: 'Lavado Básico x5', precio: 300, hora: '11:00 AM' },
        { id: '3', cliente: 'Ana Rojas', servicio: 'Limpieza Interior', precio: 120, hora: '02:15 PM' },
        { id: '4', cliente: 'Empresa XYZ', servicio: 'Suscripción Semanal', precio: 450, hora: '04:00 PM' },
      ]
    };
  }, [selectedDate]);

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
          <button className="btn-secondary">
            <CalendarCheck size={18} /> Agendar Cita
          </button>
          <button className="btn-secondary">
            <Map size={18} /> Ver Ruta del Día
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '32px' }}>
        <div className="chart-header">
          <h2 className="text-h2">Visión General del Rendimiento</h2>
        </div>
        <KpiCards kpis={kpis} />
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="chart-header">
            <div>
              <h2 className="text-h2">Valor del Pipeline por Etapa</h2>
              <p className="text-body text-muted" style={{ marginTop: '4px' }}>Servicios activos distribuidos en tu pipeline</p>
            </div>
          </div>
          <PipelineChart deals={deals.filter(d => d.status === 'open')} stages={stages} />
        </div>

        <div className="card">
          <div className="chart-header">
             <h2 className="text-h2">Mejores Promos</h2>
          </div>
          <TopDeals deals={deals} />
        </div>
      </div>
      
      <div className="card" style={{ marginTop: '0px' }}>
          <div className="chart-header">
             <h2 className="text-h2">Tendencia de Ventas (Ingresos en el tiempo)</h2>
          </div>
          <SalesTrendChart deals={deals} />
      </div>

      {/* Modal de Ingresos Detallados */}
      {showFinanzasModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--bg-color)', padding: '0', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '900px', boxShadow: 'var(--shadow-lg)', maxHeight: '95vh', overflowY: 'auto', border: '1px solid var(--border-color)' }}>
            
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
              <button onClick={() => setShowFinanzasModal(false)} style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: '32px' }}>
              {/* Selector de Fecha */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', backgroundColor: 'var(--card-bg)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Calendar size={20} className="text-muted" />
                  <span style={{ fontWeight: '500' }}>Seleccionar Fecha:</span>
                </div>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '15px', fontWeight: '500', outline: 'none' }}
                />
              </div>

              {/* Tarjetas de Métricas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
                <div style={{ backgroundColor: 'var(--card-bg)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Ingresos del Día</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>Bs {finanzasDetalladas.dia.toLocaleString()}</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--accent-green)', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: '4px', fontWeight: '500' }}>
                    <TrendingUp size={14} /> +5% vs ayer
                  </div>
                </div>
                
                <div style={{ backgroundColor: 'var(--card-bg)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Ingresos de la Semana</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>Bs {finanzasDetalladas.semana.toLocaleString()}</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--accent-green)', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: '4px', fontWeight: '500' }}>
                    <TrendingUp size={14} /> +12% vs sem. ant.
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--card-bg)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Ingresos del Mes</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>Bs {finanzasDetalladas.mes.toLocaleString()}</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--accent-green)', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: '4px', fontWeight: '500' }}>
                    <TrendingUp size={14} /> +8% vs mes ant.
                  </div>
                </div>
              </div>

              {/* Tabla Detallada */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Servicios Completados este Día</h3>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }}>
                    <Filter size={14} /> Filtrar
                  </button>
                </div>
                
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Hora</th>
                        <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Cliente</th>
                        <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Servicio Realizado</th>
                        <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Método</th>
                        <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'right' }}>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finanzasDetalladas.servicios.map((s, i) => (
                        <tr key={s.id} style={{ borderBottom: i === finanzasDetalladas.servicios.length - 1 ? 'none' : '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
                          <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-muted)' }}>{s.hora}</td>
                          <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500' }}>{s.cliente}</td>
                          <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                            <span style={{ display: 'inline-block', padding: '4px 8px', backgroundColor: 'rgba(28, 169, 201, 0.1)', color: 'var(--accent-cyan)', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                              {s.servicio}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-muted)' }}>Efectivo/QR</td>
                          <td style={{ padding: '12px 16px', fontSize: '15px', fontWeight: '700', textAlign: 'right', color: 'var(--accent-green)' }}>
                            Bs {s.precio}
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

    </div>
  );
}

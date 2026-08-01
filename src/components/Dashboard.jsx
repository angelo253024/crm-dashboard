import React, { useMemo } from 'react';
import { Plus, CalendarCheck, Map } from 'lucide-react';
import { deals, stages } from '../data/mockData';
import KpiCards from './KpiCards';
import PipelineChart from './PipelineChart';
import SalesTrendChart from './SalesTrendChart';
import TopDeals from './TopDeals';

export default function Dashboard() {
  
  // Calculate KPIs
  const kpis = useMemo(() => {
    // Simulando ingresos para el dashboard financiero
    return {
      ingresosDia: 1250,
      ingresosSemana: 8450,
      ingresosMes: 32450,
      serviciosHoy: 18
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div className="welcome-section">
        <div>
          <h1 className="text-h1">Hola, Admin 👋</h1>
          <p className="text-body text-muted" style={{ marginTop: '4px' }}>Aquí tienes el resumen de Lavamóvil Norte para hoy.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
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

    </div>
  );
}

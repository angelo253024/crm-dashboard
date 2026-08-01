import React from 'react';

// Formatter utilities
const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    maximumFractionDigits: 0
  }).format(value);
};

export default function KpiCards({ kpis }) {
  return (
    <div className="kpi-container">
      
      <div className="kpi-card">
        <div className="kpi-label">Ingresos Hoy</div>
        <div className="kpi-value">
          {formatCurrency(kpis?.ingresosDia || 0)}
          <span className="kpi-trend positive">+5% vs ayer</span>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-label">Ingresos Semana</div>
        <div className="kpi-value">
          {formatCurrency(kpis?.ingresosSemana || 0)}
          <span className="kpi-trend positive">+12% vs sem ant.</span>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-label">Ingresos Mes</div>
        <div className="kpi-value">
          {formatCurrency(kpis?.ingresosMes || 0)}
          <span className="kpi-trend positive">+8% vs mes ant.</span>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-label">Servicios Hoy</div>
        <div className="kpi-value">
          {kpis?.serviciosHoy || 0}
          <span className="kpi-trend positive">En progreso</span>
        </div>
      </div>

    </div>
  );
}

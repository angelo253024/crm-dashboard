import React from 'react';

// Formatter utilities
const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    maximumFractionDigits: 0
  }).format(value);
};

export default function KpiCards({ kpis, onCardClick }) {
  return (
    <div className="kpi-container">
      
      <div 
        className="kpi-card" 
        onClick={onCardClick}
        style={{ cursor: onCardClick ? 'pointer' : 'default', transition: 'transform 0.2s ease', '&:hover': { transform: 'translateY(-2px)' } }}
      >
        <div className="kpi-label">Ingresos Hoy</div>
        <div className="kpi-value">
          {formatCurrency(kpis?.ingresosDia || 0)}
        </div>
      </div>

      <div 
        className="kpi-card" 
        onClick={onCardClick}
        style={{ cursor: onCardClick ? 'pointer' : 'default', transition: 'transform 0.2s ease' }}
      >
        <div className="kpi-label">Ingresos Semana</div>
        <div className="kpi-value">
          {formatCurrency(kpis?.ingresosSemana || 0)}
        </div>
      </div>

      <div 
        className="kpi-card" 
        onClick={onCardClick}
        style={{ cursor: onCardClick ? 'pointer' : 'default', transition: 'transform 0.2s ease' }}
      >
        <div className="kpi-label">Ingresos Mes</div>
        <div className="kpi-value">
          {formatCurrency(kpis?.ingresosMes || 0)}
        </div>
      </div>

      <div 
        className="kpi-card" 
        onClick={onCardClick}
        style={{ cursor: onCardClick ? 'pointer' : 'default', transition: 'transform 0.2s ease' }}
      >
        <div className="kpi-label">Servicios Hoy</div>
        <div className="kpi-value">
          {kpis?.serviciosHoy || 0}
        </div>
      </div>

    </div>
  );
}

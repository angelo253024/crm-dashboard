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
        onClick={() => onCardClick?.('dia')}
        style={{ cursor: onCardClick ? 'pointer' : 'default' }}
      >
        <div className="kpi-label">Ingresos Hoy</div>
        <div className="kpi-value">
          {formatCurrency(kpis?.ingresosDia || 0)}
        </div>
      </div>

      <div 
        className="kpi-card" 
        onClick={() => onCardClick?.('semana')}
        style={{ cursor: onCardClick ? 'pointer' : 'default' }}
      >
        <div className="kpi-label">Ingresos Semana</div>
        <div className="kpi-value">
          {formatCurrency(kpis?.ingresosSemana || 0)}
        </div>
      </div>

      <div 
        className="kpi-card" 
        onClick={() => onCardClick?.('mes')}
        style={{ cursor: onCardClick ? 'pointer' : 'default' }}
      >
        <div className="kpi-label">Ingresos Mes</div>
        <div className="kpi-value">
          {formatCurrency(kpis?.ingresosMes || 0)}
        </div>
      </div>

      <div 
        className="kpi-card" 
        onClick={() => onCardClick?.('dia')}
        style={{ cursor: onCardClick ? 'pointer' : 'default' }}
      >
        <div className="kpi-label">Servicios Hoy</div>
        <div className="kpi-value">
          {kpis?.serviciosHoy || 0}
        </div>
      </div>

    </div>
  );
}

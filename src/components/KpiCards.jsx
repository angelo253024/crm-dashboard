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
        <div className="kpi-label">Ingresos del Mes</div>
        <div className="kpi-value">
          {formatCurrency(kpis?.totalRevenue || 12450)}
          <span className="kpi-trend positive">+12%</span>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-label">Servicios Completados</div>
        <div className="kpi-value">
          245
          <span className="kpi-trend positive">+15 hoy</span>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-label">Nuevos Clientes</div>
        <div className="kpi-value">
          32
          <span className="kpi-trend positive">75% recurrentes</span>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-label">Trabajador Destacado</div>
        <div className="kpi-value">
          Carlos R.
          <span className="kpi-trend positive">52 serv.</span>
        </div>
      </div>

    </div>
  );
}
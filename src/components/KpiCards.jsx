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
        <div className="kpi-label">Total Revenue</div>
        <div className="kpi-value">
          {formatCurrency(kpis.totalRevenue)}
          <span className="kpi-trend positive">+12% vs last month</span>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-label">Active Deals</div>
        <div className="kpi-value">
          {kpis.activeDeals}
          <span className="kpi-trend positive">+5.2% </span>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-label">Win Rate</div>
        <div className="kpi-value">
          {kpis.winRate}%
          <span className="kpi-trend negative">-2.1% </span>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-label">Avg Deal Size</div>
        <div className="kpi-value">
          {formatCurrency(kpis.avgDealSize)}
          <span className="kpi-trend positive">+8.4% </span>
        </div>
      </div>

    </div>
  );
}

import React from 'react';

export default function Zonas() {
  return (
    <div className="card" style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 className="text-h2">Mapa y Zonas de Cobertura</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-primary" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--accent-dark)', border: '1px solid var(--accent-green)' }}>Ver Zonas</button>
          <button className="btn-primary">Optimizar Ruta</button>
        </div>
      </div>
      <div style={{ height: '400px', backgroundColor: '#e5e7eb', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-muted">Vista del Mapa de Clientes en Tiempo Real (Mockup)</p>
      </div>
    </div>
  );
}
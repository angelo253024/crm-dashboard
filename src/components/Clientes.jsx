import React from 'react';

export default function Clientes() {
  return (
    <div className="card" style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 className="text-h2">Clientes y Vehículos</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-primary" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--accent-dark)', border: '1px solid var(--accent-green)' }}>+ Agregar Vehículo</button>
          <button className="btn-primary">+ Agregar Cliente</button>
        </div>
      </div>
      <p className="text-body text-muted">Base de datos de clientes, historial de servicios y botón de recordatorio por WhatsApp.</p>
    </div>
  );
}
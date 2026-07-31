import React from 'react';

export default function Trabajadores() {
  return (
    <div className="card" style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 className="text-h2">Trabajadores (Lavadores)</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-primary" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--accent-dark)', border: '1px solid var(--accent-green)' }}>Asignar Servicio</button>
          <button className="btn-primary">+ Agregar Trabajador</button>
        </div>
      </div>
      <p className="text-body text-muted">Gestión de turnos, disponibilidad y estados (Disponible / En Servicio / Descanso).</p>
    </div>
  );
}
import React from 'react';

export default function Productos() {
  return (
    <div className="card" style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 className="text-h2">Inventario y Productos</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-primary" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--accent-dark)', border: '1px solid var(--accent-green)' }}>+ Agregar Insumo</button>
          <button className="btn-primary">+ Agregar Servicio</button>
        </div>
      </div>
      <p className="text-body text-muted">Gestor de stock de insumos (shampoo, cera) y lista de precios de servicios.</p>
    </div>
  );
}
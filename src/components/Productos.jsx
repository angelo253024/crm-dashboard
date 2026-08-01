import React, { useState, useEffect } from 'react';
import { Plus, Database } from 'lucide-react';
import { supabase } from '../supabase';

export default function Productos() {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServicios();
  }, []);

  const fetchServicios = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('servicios').select('*');
    if (error) {
      console.error('Error fetching servicios:', error);
    } else {
      // Group by category
      const grouped = data.reduce((acc, curr) => {
        const cat = acc.find(c => c.category === curr.categoria);
        if (cat) {
          cat.items.push(curr);
        } else {
          acc.push({ category: curr.categoria, items: [curr] });
        }
        return acc;
      }, []);
      setCatalog(grouped);
    }
    setLoading(false);
  };

  const seedDatabase = async () => {
    const mockServices = [
      { categoria: 'Lavado Clásico', nombre: 'Lavado Clásico "P"', precio: 60 },
      { categoria: 'Lavado Clásico', nombre: 'Lavado Clásico "M"', precio: 70 },
      { categoria: 'Lavado Clásico', nombre: 'Lavado Clásico "L"', precio: 80 },
      { categoria: 'Lavado Clásico', nombre: 'Lavado Clásico "XL"', precio: 90 },
      { categoria: 'Lavado Premium', nombre: 'Lavado Premium "P"', precio: 120 },
      { categoria: 'Lavado Premium', nombre: 'Lavado Premium "M"', precio: 130 },
      { categoria: 'Lavado Premium', nombre: 'Lavado Premium "L"', precio: 140 },
      { categoria: 'Lavado Premium', nombre: 'Lavado Premium "XL"', precio: 150 },
      { categoria: 'Lavado Bicis y Motos', nombre: 'Lavado Bicis', precio: 20 },
      { categoria: 'Lavado Bicis y Motos', nombre: 'Lavado Motos "P"', precio: 30 },
      { categoria: 'Lavado Bicis y Motos', nombre: 'Lavado Motos "M"', precio: 40 },
      { categoria: 'Lavado Bicis y Motos', nombre: 'Lavado Motos "L"', precio: 50 },
      { categoria: 'Lavado Bicis y Motos', nombre: 'Lavado UTVs "XL"', precio: 70 },
      { categoria: 'Personaliza tu lavado', nombre: 'Solo Lavado por fuera (Desde)', precio: 40 },
      { categoria: 'Personaliza tu lavado', nombre: 'Solo Lavado por dentro (Desde)', precio: 40 },
      { categoria: 'Personaliza tu lavado', nombre: 'Lustrado de Auto (Desde)', precio: 30 },
    ];
    
    const { error } = await supabase.from('servicios').insert(mockServices);
    if (error) {
      alert('Error al poblar base de datos');
    } else {
      alert('Servicios agregados con éxito');
      fetchServicios();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 className="text-h2">Catálogo de Servicios</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            {catalog.length === 0 && !loading && (
              <button className="btn-secondary" onClick={seedDatabase}>
                <Database size={16} /> Poblar Servicios
              </button>
            )}
            <button className="btn-primary" onClick={() => alert('Modal Nuevo Servicio (Proximamente)')}>
              <Plus size={16} /> Nuevo Servicio
            </button>
          </div>
        </div>
        
        {loading ? (
           <p style={{ textAlign: 'center', padding: '24px' }}>Cargando servicios...</p>
        ) : catalog.length === 0 ? (
           <p style={{ textAlign: 'center', padding: '24px' }}>No hay servicios. Presiona "Poblar Servicios" para agregar el catálogo base.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {catalog.map((cat, i) => (
              <div key={i} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px', backgroundColor: 'var(--bg-color)' }}>
                <h3 className="text-h3" style={{ color: 'var(--accent-dark)', marginBottom: '16px' }}>{cat.category}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {cat.items.map((item, j) => (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                      <span className="text-body font-medium">{item.nombre}</span>
                      <span className="text-body font-semibold" style={{ color: 'var(--accent-green)' }}>Bs.{item.precio}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { Tag } from 'lucide-react';

export default function TopDeals({ promos = [] }) {
  const activePromos = promos.filter(p => p.activa).slice(0, 4);

  const formatCurrency = (value) => {
    if (!value) return '';
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div style={{ marginTop: '16px' }}>
      {activePromos.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Tag size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
          <p>No hay promociones activas en este momento.</p>
        </div>
      ) : (
        activePromos.map((promo) => (
          <div key={promo.id} className="list-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '8px', 
                background: 'rgba(28, 169, 201, 0.1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--accent-green)'
              }}>
                <Tag size={20} />
              </div>
              <div>
                <div className="text-small font-semibold">{promo.titulo}</div>
                <div className="text-small text-muted">{promo.tipo === 'descuento' ? 'Descuento' : 'Combo'}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="text-small font-semibold">
                {promo.tipo === 'descuento' ? `-${promo.descuento_porcentaje}%` : formatCurrency(promo.precio_combo)}
              </div>
              <div className="status-badge" style={{ display: 'inline-block', marginTop: '4px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)' }}>
                Activa
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

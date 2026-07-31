import React from 'react';
import { customers } from '../data/mockData';

export default function TopDeals({ deals }) {
  // Sort open deals by amount descending, get top 4
  const topDeals = [...deals]
    .filter(d => d.status === 'open')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

  const getCustomerName = (id) => {
    return customers.find(c => c.id === id)?.company_name || 'Unknown';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div style={{ marginTop: '16px' }}>
      {topDeals.map((deal) => (
        <div key={deal.id} className="list-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '8px', 
              background: '#fef3c7', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: '600',
              color: '#d97706'
            }}>
              {getCustomerName(deal.customer_id).charAt(0)}
            </div>
            <div>
              <div className="text-small font-semibold">{deal.title}</div>
              <div className="text-small text-muted">{getCustomerName(deal.customer_id)}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="text-small font-semibold">{formatCurrency(deal.amount)}</div>
            <div className="status-badge status-open" style={{ display: 'inline-block', marginTop: '4px' }}>
              Pending
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

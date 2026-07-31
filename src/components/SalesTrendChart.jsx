import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SalesTrendChart({ deals }) {
  const data = useMemo(() => {
    const wonDeals = deals.filter(d => d.status === 'won');
    
    // Group by month
    const monthlyData = wonDeals.reduce((acc, deal) => {
      const date = new Date(deal.closed_at || deal.created_at);
      const month = date.toLocaleString('default', { month: 'short' });
      
      if (!acc[month]) {
        acc[month] = { name: month, revenue: 0 };
      }
      acc[month].revenue += deal.amount;
      return acc;
    }, {});

    // Sort months (simplified for this mock)
    const monthsOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Object.values(monthlyData).sort((a, b) => {
      return monthsOrder.indexOf(a.name) - monthsOrder.indexOf(b.name);
    });
  }, [deals]);

  const formatCurrency = (value) => `Bs ${(value / 1000).toFixed(0)}k`;

  return (
    <div style={{ height: 300, width: '100%', marginTop: '20px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
          <YAxis tickFormatter={formatCurrency} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            formatter={(value) => [`Bs ${value.toLocaleString('es-BO')}`, 'Revenue']}
          />
          <Area type="monotone" dataKey="revenue" stroke="#4ade80" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

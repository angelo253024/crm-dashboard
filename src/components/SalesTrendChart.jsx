import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SalesTrendChart({ reservas = [] }) {
  const data = useMemo(() => {
    // Solo contar reservas que no estén canceladas (o solo completadas, dependiento la lógica. Usaremos no canceladas por ahora)
    const validReservas = reservas.filter(r => r.estado !== 'Cancelado');
    
    // Group by month
    const monthlyData = validReservas.reduce((acc, reserva) => {
      const dateString = reserva.fecha_reserva || reserva.created_at;
      if (!dateString) return acc;
      
      const date = new Date(dateString);
      const month = date.toLocaleString('es-ES', { month: 'short' });
      
      // capitalize first letter
      const monthCapitalized = month.charAt(0).toUpperCase() + month.slice(1);

      if (!acc[monthCapitalized]) {
        acc[monthCapitalized] = { name: monthCapitalized, revenue: 0 };
      }
      acc[monthCapitalized].revenue += (reserva.precio_total || 0);
      return acc;
    }, {});

    // Sort months
    const monthsOrder = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return Object.values(monthlyData).sort((a, b) => {
      return monthsOrder.indexOf(a.name) - monthsOrder.indexOf(b.name);
    });
  }, [reservas]);

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
              <stop offset="5%" stopColor="#1CA9C9" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#1CA9C9" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} dy={10} />
          <YAxis tickFormatter={formatCurrency} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-soft)', backgroundColor: 'var(--card-bg)', color: 'var(--text-main)' }}
            formatter={(value) => [`Bs ${value.toLocaleString('es-BO')}`, 'Ingresos']}
          />
          <Area type="monotone" dataKey="revenue" stroke="#1CA9C9" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function PipelineChart({ deals, stages }) {
  
  const data = useMemo(() => {
    // Group amount by stage
    const grouped = stages.map(stage => {
      const stageDeals = deals.filter(d => d.stage_id === stage.id);
      const totalAmount = stageDeals.reduce((sum, d) => sum + d.amount, 0);
      return {
        name: stage.name,
        value: totalAmount,
        originalStage: stage
      };
    });
    return grouped;
  }, [deals, stages]);

  const formatCurrency = (value) => `Bs ${(value / 1000).toFixed(0)}k`;

  return (
    <div style={{ height: 300, width: '100%', marginTop: '20px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          barSize={40}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} dy={10} />
          <YAxis tickFormatter={formatCurrency} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
          <Tooltip 
            cursor={{fill: 'var(--bg-color)'}}
            contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-soft)', backgroundColor: 'var(--card-bg)', color: 'var(--text-main)' }}
            formatter={(value) => [`Bs ${value.toLocaleString('es-BO')}`, 'Valor']}
          />
          <Bar dataKey="value" radius={[6, 6, 6, 6]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.name === 'Agendado' ? '#1CA9C9' : '#1E4C9A'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

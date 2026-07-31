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
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
          <YAxis tickFormatter={formatCurrency} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
          <Tooltip 
            cursor={{fill: '#f3f4f6'}}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            formatter={(value) => [`Bs ${value.toLocaleString('es-BO')}`, 'Pipeline Value']}
          />
          <Bar dataKey="value" radius={[6, 6, 6, 6]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.name === 'Negotiation' ? '#ff6b6b' : '#f3f4f6'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

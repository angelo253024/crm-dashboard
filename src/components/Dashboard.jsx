import React, { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { deals, stages } from '../data/mockData';
import KpiCards from './KpiCards';
import PipelineChart from './PipelineChart';
import SalesTrendChart from './SalesTrendChart';
import TopDeals from './TopDeals';

export default function Dashboard() {
  
  // Calculate KPIs
  const kpis = useMemo(() => {
    const wonDeals = deals.filter(d => d.status === 'won');
    const lostDeals = deals.filter(d => d.status === 'lost');
    const openDeals = deals.filter(d => d.status === 'open');
    
    const totalRevenue = wonDeals.reduce((sum, deal) => sum + deal.amount, 0);
    const totalClosed = wonDeals.length + lostDeals.length;
    const winRate = totalClosed > 0 ? (wonDeals.length / totalClosed) * 100 : 0;
    const avgDealSize = wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0;

    return {
      totalRevenue,
      activeDeals: openDeals.length,
      winRate: winRate.toFixed(1),
      avgDealSize
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div className="welcome-section">
        <div>
          <h1 className="text-h1">Dashboard</h1>
          <p className="text-body text-muted">Welcome, let's dive into your sales performance.</p>
        </div>
        <button className="btn-primary">
          <Plus size={18} />
          Create Deal
        </button>
      </div>

      <div className="card" style={{ padding: '32px' }}>
        <div className="chart-header">
          <h2 className="text-h2">Performance Overview</h2>
        </div>
        <KpiCards kpis={kpis} />
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="chart-header">
            <div>
              <h2 className="text-h2">Pipeline Value by Stage</h2>
              <p className="text-body text-muted" style={{ marginTop: '4px' }}>Active deals distributed across your pipeline</p>
            </div>
          </div>
          <PipelineChart deals={deals.filter(d => d.status === 'open')} stages={stages} />
        </div>

        <div className="card">
          <div className="chart-header">
             <h2 className="text-h2">Top Deals</h2>
          </div>
          <TopDeals deals={deals} />
        </div>
      </div>
      
      <div className="card" style={{ marginTop: '0px' }}>
          <div className="chart-header">
             <h2 className="text-h2">Sales Trend (Revenue over time)</h2>
          </div>
          <SalesTrendChart deals={deals} />
      </div>

    </div>
  );
}

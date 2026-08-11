import React, { useState, useEffect, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { supabase } from '../supabase';

export default function WorkerStatsModal({ worker, onClose }) {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchToday, setSearchToday] = useState('');
  const [searchWeek, setSearchWeek] = useState('');

  useEffect(() => {
    if (worker) {
      fetchReservas();
    }
  }, [worker]);

  const fetchReservas = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reservas')
      .select('*')
      .eq('trabajador_id', worker.id)
      .neq('estado_reserva', 'Cancelado')
      .order('created_at', { ascending: false });
    
    if (data) {
      setReservas(data);
    }
    setLoading(false);
  };

  const stats = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Calcula el inicio de la semana (Lunes)
    const currentDay = today.getDay(); // 0 = Domingo, 1 = Lunes, etc.
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const todayReservas = reservas.filter(r => {
      const dateStr = String(r.fecha_reserva || r.created_at || '').split('T')[0];
      return dateStr === todayStr;
    });

    const weekReservas = reservas.filter(r => {
      const d = new Date(r.fecha_reserva || r.created_at);
      return d >= startOfWeek && d <= today;
    });

    const sumIngresos = (arr) => arr.reduce((sum, r) => sum + (Number(r.precio_total) || Number(r.precio) || 0), 0);

    return {
      todayReservas,
      weekReservas,
      ingresosHoy: sumIngresos(todayReservas),
      ingresosSemana: sumIngresos(weekReservas)
    };
  }, [reservas]);

  const renderTable = (data, search, title) => {
    const filtered = data.filter(s => {
      if (!search) return true;
      const q = search.toLowerCase();
      const client = (s.cliente_nombre || s.cliente || '').toLowerCase();
      const service = (s.servicio || '').toLowerCase();
      return client.includes(q) || service.includes(q);
    });

    return (
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{title}</h3>
          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Buscar cliente o servicio..." 
              value={search}
              onChange={(e) => title.includes('Día') ? setSearchToday(e.target.value) : setSearchWeek(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
            />
          </div>
        </div>
        
        <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay servicios para mostrar.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Hora</th>
                    <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Cliente</th>
                    <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Trabajador</th>
                    <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Servicio Realizado</th>
                    <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Método</th>
                    <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'right' }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: i === filtered.length - 1 ? 'none' : '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-muted)' }}>{String(s.hora_reserva || s.hora || '').substring(0, 5)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500' }}>{s.cliente_nombre || s.cliente}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-muted)' }}>{worker.nombre}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                        <span style={{ display: 'inline-block', padding: '4px 8px', backgroundColor: 'rgba(28, 169, 201, 0.1)', color: 'var(--accent-cyan)', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                          {s.servicio || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-muted)' }}>{s.metodo_pago || '-'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 'bold', textAlign: 'right' }}>Bs {Number(s.precio_total) || Number(s.precio) || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '24px' }}>
      <div style={{ backgroundColor: 'var(--bg-color)', width: '100%', maxWidth: '900px', maxHeight: '90vh', borderRadius: '16px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--card-bg)' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px' }}>
            Estadísticas: <span style={{ color: 'var(--accent-cyan)' }}>{worker.nombre}</span>
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando estadísticas...</div>
          ) : (
            <>
              {/* KPIs */}
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0' }}>Visión General del Rendimiento</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', padding: '24px', border: '1px solid var(--border-color)' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-muted)' }}>Ingresos Hoy</p>
                  <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>Bs {stats.ingresosHoy}</p>
                </div>
                <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', padding: '24px', border: '1px solid var(--border-color)' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-muted)' }}>Ingresos Semana</p>
                  <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>Bs {stats.ingresosSemana}</p>
                </div>
              </div>

              {/* Tables */}
              {renderTable(stats.todayReservas, searchToday, 'Servicios Completados este Día')}
              {renderTable(stats.weekReservas, searchWeek, 'Servicios Completados esta Semana')}
            </>
          )}
        </div>

      </div>
    </div>
  );
}

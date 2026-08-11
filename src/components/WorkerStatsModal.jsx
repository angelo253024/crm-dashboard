import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, DollarSign, Wallet, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabase';

export default function WorkerStatsModal({ worker, currentUser, onClose }) {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  
  // General Tab State
  const [reservas, setReservas] = useState([]);
  const [searchToday, setSearchToday] = useState('');
  const [searchWeek, setSearchWeek] = useState('');

  // Liquidación Tab State
  const [comisiones, setComisiones] = useState([]);
  const [anticipos, setAnticipos] = useState([]);
  const [comisionesFilter, setComisionesFilter] = useState('all'); // 'all', 'today', 'week'
  
  // Modals
  const [showAnticipoModal, setShowAnticipoModal] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [anticipoAmount, setAnticipoAmount] = useState('');
  const [anticipoObs, setAnticipoObs] = useState('');

  const isAdmin = currentUser?.rol === 'Administrador';

  useEffect(() => {
    if (worker) {
      fetchData();
    }
  }, [worker]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch Reservas (General Tab)
    const { data: reservasData } = await supabase
      .from('reservas')
      .select('*')
      .eq('trabajador_id', worker.id)
      .neq('estado_reserva', 'Cancelado')
      .order('created_at', { ascending: false });
    
    if (reservasData) setReservas(reservasData);

    // Fetch Comisiones Pendientes
    const { data: comisionesData } = await supabase
      .from('comisiones')
      .select('*')
      .eq('trabajador_id', worker.id)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false });
    
    if (comisionesData) setComisiones(comisionesData);

    // Fetch Anticipos Pendientes (No liquidados)
    const { data: anticiposData } = await supabase
      .from('anticipos')
      .select('*')
      .eq('trabajador_id', worker.id)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false });
    
    if (anticiposData) setAnticipos(anticiposData);

    setLoading(false);
  };

  // --- GENERAL TAB COMPUTATIONS ---
  const generalStats = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const currentDay = today.getDay();
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

  // --- LIQUIDACIÓN TAB COMPUTATIONS ---
  const liquidacionStats = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const totalComisiones = comisiones.reduce((sum, c) => sum + Number(c.monto_comision), 0);
    const totalAnticipos = anticipos.reduce((sum, a) => sum + Number(a.monto), 0);
    const saldoAcumulado = totalComisiones - totalAnticipos;

    const comisionesHoy = comisiones.filter(c => String(c.created_at).split('T')[0] === todayStr)
                                    .reduce((sum, c) => sum + Number(c.monto_comision), 0);
                                    
    const comisionesSemana = comisiones.filter(c => {
                                      const d = new Date(c.created_at);
                                      return d >= startOfWeek && d <= today;
                                    })
                                    .reduce((sum, c) => sum + Number(c.monto_comision), 0);

    return {
      totalComisiones,
      totalAnticipos,
      saldoAcumulado: Math.max(0, saldoAcumulado), // Prevenir negativos visuales si hay algún error
      comisionesHoy,
      comisionesSemana
    };
  }, [comisiones, anticipos]);

  // --- HANDLERS ---
  const handleRegistrarAnticipo = async () => {
    const monto = Number(anticipoAmount);
    if (!monto || monto <= 0) return alert("Ingrese un monto válido.");
    if (monto > liquidacionStats.saldoAcumulado) return alert("El anticipo no puede ser mayor al saldo acumulado disponible.");

    const { error } = await supabase.from('anticipos').insert([{
      trabajador_id: worker.id,
      administrador_id: currentUser.id,
      monto: monto,
      observaciones: anticipoObs || 'Anticipo registrado'
    }]);

    if (error) {
      alert("Error al registrar anticipo: " + error.message);
    } else {
      setAnticipoAmount('');
      setAnticipoObs('');
      setShowAnticipoModal(false);
      fetchData(); // Recargar datos
    }
  };

  const handlePagarLiquidacion = async () => {
    if (liquidacionStats.saldoAcumulado <= 0) return alert("No hay saldo para pagar.");

    // 1. Registrar el pago en el historial
    const { error: pagoError, data: pagoData } = await supabase.from('pagos_liquidacion').insert([{
      trabajador_id: worker.id,
      administrador_id: currentUser.id,
      monto_generado: liquidacionStats.totalComisiones,
      anticipos_descontados: liquidacionStats.totalAnticipos,
      monto_pagado: liquidacionStats.saldoAcumulado,
      observaciones: 'Pago de liquidación',
      periodo: 'Cierre Manual'
    }]).select();

    if (pagoError) return alert("Error al registrar el pago: " + pagoError.message);

    // 2. Actualizar las comisiones pendientes a 'pagado'
    const comisionesIds = comisiones.map(c => c.id);
    if (comisionesIds.length > 0) {
      await supabase.from('comisiones')
        .update({ estado: 'pagado' })
        .in('id', comisionesIds);
    }

    // 3. Actualizar anticipos pendientes a 'liquidado'
    const anticiposIds = anticipos.map(a => a.id);
    if (anticiposIds.length > 0) {
      await supabase.from('anticipos')
        .update({ estado: 'liquidado' })
        .in('id', anticiposIds);
    }

    setShowPagoModal(false);
    fetchData(); // Recargar todo, los pendientes desaparecerán
    alert("Liquidación pagada exitosamente. El saldo del trabajador vuelve a Bs 0.");
  };

  // --- RENDERERS ---
  const renderGeneralTable = (data, search, title) => {
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
                    <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Servicio Realizado</th>
                    <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Método</th>
                    <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'right' }}>Cobro a Cliente</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: i === filtered.length - 1 ? 'none' : '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-muted)' }}>{String(s.hora_reserva || s.hora || '').substring(0, 5)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500' }}>{s.cliente_nombre || s.cliente}</td>
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

  const renderComisionesTable = () => {
    let title = "Detalle de Comisiones Pendientes";
    let filteredComisiones = comisiones;

    if (comisionesFilter === 'today') {
      title = "Comisiones Pendientes (Hoy)";
      const todayStr = new Date().toISOString().split('T')[0];
      filteredComisiones = comisiones.filter(c => String(c.created_at).split('T')[0] === todayStr);
    } else if (comisionesFilter === 'week') {
      title = "Comisiones Pendientes (Semana)";
      const today = new Date();
      const currentDay = today.getDay();
      const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - distanceToMonday);
      startOfWeek.setHours(0, 0, 0, 0);
      filteredComisiones = comisiones.filter(c => {
        const d = new Date(c.created_at);
        return d >= startOfWeek && d <= today;
      });
    }

    return (
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', marginTop: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{title}</h3>
          {comisionesFilter !== 'all' && (
            <button onClick={() => setComisionesFilter('all')} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}>
              Ver Todas
            </button>
          )}
        </div>
        <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          {filteredComisiones.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay comisiones para el filtro seleccionado.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Fecha</th>
                    <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Servicio Individual</th>
                    <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Tipo</th>
                    <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Cobrado</th>
                    <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Porcentaje</th>
                    <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'right' }}>Comisión</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComisiones.map((c, i) => (
                    <tr key={c.id} style={{ borderBottom: i === filteredComisiones.length - 1 ? 'none' : '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500' }}>{c.servicio_nombre}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                        <span style={{ display: 'inline-block', padding: '4px 8px', backgroundColor: c.tipo === 'Lavado' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(241, 196, 15, 0.1)', color: c.tipo === 'Lavado' ? '#2ecc71' : '#f1c40f', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                          {c.tipo}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-muted)' }}>Bs {c.precio}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-muted)' }}>{c.porcentaje * 100}%</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 'bold', textAlign: 'right', color: 'var(--accent-cyan)' }}>+ Bs {c.monto_comision}</td>
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

  const renderAnticiposTable = () => {
    if (anticipos.length === 0) return null;
    return (
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Anticipos Descontados (Aún no liquidados)</h3>
        <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)' }}>
                <tr>
                  <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Fecha</th>
                  <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Observación</th>
                  <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'right' }}>Monto Descontado</th>
                </tr>
              </thead>
              <tbody>
                {anticipos.map((a, i) => (
                  <tr key={a.id} style={{ borderBottom: i === anticipos.length - 1 ? 'none' : '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-muted)' }}>{new Date(a.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500' }}>{a.observaciones}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 'bold', textAlign: 'right', color: '#e74c3c' }}>- Bs {a.monto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return createPortal(
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '24px' }}>
      <div style={{ backgroundColor: 'var(--bg-color)', width: '100%', maxWidth: '1000px', maxHeight: '90vh', borderRadius: '16px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--card-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px' }}>
              Perfil de: <span style={{ color: 'var(--accent-cyan)' }}>{worker.nombre}</span>
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setActiveTab('general')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px', backgroundColor: activeTab === 'general' ? 'rgba(28, 169, 201, 0.1)' : 'transparent', color: activeTab === 'general' ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                <FileText size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} /> General
              </button>
              <button onClick={() => setActiveTab('liquidacion')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px', backgroundColor: activeTab === 'liquidacion' ? 'rgba(46, 204, 113, 0.1)' : 'transparent', color: activeTab === 'liquidacion' ? '#2ecc71' : 'var(--text-muted)' }}>
                <DollarSign size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} /> Liquidación y Nómina
              </button>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando datos...</div>
          ) : (
            <>
              {activeTab === 'general' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                    <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', padding: '24px', border: '1px solid var(--border-color)' }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-muted)' }}>Ingresos Generados a la Empresa (Hoy)</p>
                      <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>Bs {generalStats.ingresosHoy}</p>
                    </div>
                    <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', padding: '24px', border: '1px solid var(--border-color)' }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-muted)' }}>Ingresos Generados a la Empresa (Semana)</p>
                      <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>Bs {generalStats.ingresosSemana}</p>
                    </div>
                  </div>
                  {renderGeneralTable(generalStats.todayReservas, searchToday, 'Servicios Completados este Día')}
                  {renderGeneralTable(generalStats.weekReservas, searchWeek, 'Servicios Completados esta Semana')}
                </div>
              )}

              {activeTab === 'liquidacion' && (
                <div>
                  {/* Liquidacion Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Cálculo Automático de Comisiones</h3>
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={() => setShowAnticipoModal(true)} disabled={liquidacionStats.saldoAcumulado <= 0} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', fontWeight: 'bold', cursor: liquidacionStats.saldoAcumulado <= 0 ? 'not-allowed' : 'pointer', opacity: liquidacionStats.saldoAcumulado <= 0 ? 0.5 : 1 }}>
                          Registrar Anticipo
                        </button>
                        <button onClick={() => setShowPagoModal(true)} disabled={liquidacionStats.saldoAcumulado <= 0} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#2ecc71', color: '#fff', fontWeight: 'bold', cursor: liquidacionStats.saldoAcumulado <= 0 ? 'not-allowed' : 'pointer', opacity: liquidacionStats.saldoAcumulado <= 0 ? 0.5 : 1 }}>
                          Pagar Liquidación
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Liquidacion KPIs */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                    <div 
                      onClick={() => setComisionesFilter('all')}
                      style={{ backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', padding: '20px', border: '1px solid var(--border-color)', borderTop: comisionesFilter === 'all' ? '4px solid #2ecc71' : '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-muted)' }}>Saldo Pendiente a Pagar</p>
                      <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#2ecc71' }}>Bs {liquidacionStats.saldoAcumulado}</p>
                    </div>
                    <div 
                      onClick={() => setComisionesFilter('today')}
                      style={{ backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', padding: '20px', border: comisionesFilter === 'today' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.2s', boxShadow: comisionesFilter === 'today' ? '0 0 0 1px var(--accent-cyan)' : 'none' }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-muted)' }}>Comisión Hoy (Clic para ver)</p>
                      <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>Bs {liquidacionStats.comisionesHoy}</p>
                    </div>
                    <div 
                      onClick={() => setComisionesFilter('week')}
                      style={{ backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', padding: '20px', border: comisionesFilter === 'week' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.2s', boxShadow: comisionesFilter === 'week' ? '0 0 0 1px var(--accent-cyan)' : 'none' }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-muted)' }}>Comisión Semana (Clic para ver)</p>
                      <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>Bs {liquidacionStats.comisionesSemana}</p>
                    </div>
                    <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', padding: '20px', border: '1px solid var(--border-color)' }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-muted)' }}>Anticipos Descontados</p>
                      <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#e74c3c' }}>Bs {liquidacionStats.totalAnticipos}</p>
                    </div>
                  </div>

                  {renderComisionesTable()}
                  {renderAnticiposTable()}
                </div>
              )}
            </>
          )}
        </div>

      </div>

      {/* Anticipo Modal */}
      {showAnticipoModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000 }}>
          <div style={{ backgroundColor: 'var(--card-bg)', padding: '32px', borderRadius: '16px', width: '400px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }}>Registrar Anticipo a {worker.nombre}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>Saldo disponible para adelantar: <strong>Bs {liquidacionStats.saldoAcumulado}</strong></p>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Monto (Bs)</label>
              <input type="number" value={anticipoAmount} onChange={(e) => setAnticipoAmount(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Observaciones</label>
              <input type="text" value={anticipoObs} onChange={(e) => setAnticipoObs(e.target.value)} placeholder="Ej. Adelanto para almuerzo" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }} />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAnticipoModal(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleRegistrarAnticipo} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--accent-cyan)', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Anticipo</button>
            </div>
          </div>
        </div>
      )}

      {/* Pago Liquidación Modal */}
      {showPagoModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000 }}>
          <div style={{ backgroundColor: 'var(--card-bg)', padding: '32px', borderRadius: '16px', width: '450px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', color: '#2ecc71' }}>
              <CheckCircle size={32} />
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: 'var(--text-main)' }}>Confirmar Pago de Liquidación</h3>
            </div>
            
            <div style={{ backgroundColor: 'var(--bg-color)', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Ganancias Acumuladas:</span>
                <span>Bs {liquidacionStats.totalComisiones}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: '#e74c3c' }}>
                <span>Anticipos Descontados:</span>
                <span>- Bs {liquidacionStats.totalAnticipos}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '16px', fontWeight: 'bold', fontSize: '18px' }}>
                <span>Total a Pagar ahora:</span>
                <span style={{ color: '#2ecc71' }}>Bs {liquidacionStats.saldoAcumulado}</span>
              </div>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px', display: 'flex', gap: '8px' }}>
              <AlertTriangle size={16} style={{ color: '#f1c40f', flexShrink: 0 }} /> 
              Al confirmar, el saldo del trabajador volverá a cero y esta liquidación quedará en el historial inmutable de pagos.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPagoModal(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handlePagarLiquidacion} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#2ecc71', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Sí, Efectuar Pago</button>
            </div>
          </div>
        </div>
      )}

    </div>,
    document.body
  );
}

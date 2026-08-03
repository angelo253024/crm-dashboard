import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Clock, Calendar as CalendarIcon, User, RefreshCw } from 'lucide-react';

export default function AdminHorarios() {
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchHorarios();
  }, [fechaFiltro]);

  const fetchHorarios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('trabajador_horarios')
      .select(`
        *,
        trabajadores (
          nombre,
          estado_disponibilidad
        )
      `)
      .eq('fecha', fechaFiltro)
      .order('hora_ingreso', { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setHorarios(data || []);
    }
    setLoading(false);
  };

  const formatearHora = (fechaIso) => {
    if (!fechaIso) return '--:--';
    return new Date(fechaIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calcularHoras = (ingreso, salida) => {
    if (!ingreso || !salida) return 'En turno';
    const diff = new Date(salida) - new Date(ingreso);
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${horas}h ${minutos}m`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Clock size={28} color="var(--accent-cyan)" />
            Control de Horarios y Asistencia
          </h1>
          <p className="text-muted" style={{ marginTop: '4px' }}>Supervisa las horas de conexión de las motos.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <CalendarIcon size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="date" 
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              style={{ padding: '10px 10px 10px 36px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', outline: 'none' }}
            />
          </div>
          <button onClick={fetchHorarios} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}>
            <RefreshCw size={16} /> Refrescar
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Trabajador</th>
                <th>Estado Actual</th>
                <th>Hora de Ingreso</th>
                <th>Hora de Salida</th>
                <th>Tiempo Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px' }}>Cargando horarios...</td>
                </tr>
              ) : horarios.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No hay registros de asistencia para esta fecha.
                  </td>
                </tr>
              ) : (
                horarios.map((h) => (
                  <tr key={h.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={16} />
                        </div>
                        <span style={{ fontWeight: '500' }}>{h.trabajadores?.nombre || 'Desconocido'}</span>
                      </div>
                    </td>
                    <td>
                      {h.trabajadores?.estado_disponibilidad === 'disponible' && <span style={{ color: '#10b981', fontWeight: '600' }}>Disponible</span>}
                      {h.trabajadores?.estado_disponibilidad === 'ocupado' && <span style={{ color: '#f59e0b', fontWeight: '600' }}>Ocupado</span>}
                      {h.trabajadores?.estado_disponibilidad === 'inactivo' && <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Inactivo</span>}
                    </td>
                    <td>
                      <div style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontWeight: 'bold', fontSize: '13px' }}>
                        {formatearHora(h.hora_ingreso)}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '4px', backgroundColor: h.hora_salida ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: h.hora_salida ? '#ef4444' : '#3b82f6', fontWeight: 'bold', fontSize: '13px' }}>
                        {formatearHora(h.hora_salida)}
                      </div>
                    </td>
                    <td style={{ fontWeight: '500' }}>
                      {calcularHoras(h.hora_ingreso, h.hora_salida)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

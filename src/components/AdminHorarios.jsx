import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Clock, Calendar as CalendarIcon, User, RefreshCw } from 'lucide-react';

export default function AdminHorarios({ user }) {
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const isAdmin = user?.rol === 'Administrador' || user?.rol === 'Admin';

  useEffect(() => {
    fetchHorarios();
  }, [user]);

  const fetchHorarios = async () => {
    setLoading(true);
    
    // Calcular rango de fechas
    const today = new Date();
    const startDate = new Date();
    if (isAdmin) {
      startDate.setDate(today.getDate() - 30); // 30 días para Admin
    } else {
      startDate.setDate(today.getDate() - 7); // 7 días para Trabajador
    }
    
    let query = supabase
      .from('trabajador_horarios')
      .select(`
        *,
        trabajadores (
          nombre,
          estado_disponibilidad
        )
      `)
      .gte('fecha', startDate.toISOString().split('T')[0])
      .order('fecha', { ascending: false })
      .order('hora_ingreso', { ascending: false });

    if (!isAdmin && user?.id) {
      query = query.eq('trabajador_id', user.id);
    }

    const { data, error } = await query;
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Clock size={28} color="var(--accent-cyan)" />
            {isAdmin ? 'Control de Horarios General' : 'Mi Registro de Horarios'}
          </h1>
          <p className="text-muted" style={{ marginTop: '4px' }}>
            {isAdmin ? 'Mostrando registros de los últimos 30 días.' : 'Mostrando tus registros de los últimos 7 días.'}
          </p>
        </div>
        
        <button onClick={fetchHorarios} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}>
          <RefreshCw size={16} /> Refrescar
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                {isAdmin && <th>Trabajador</th>}
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
                  <td colSpan={isAdmin ? "5" : "4"} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No hay registros de asistencia para este periodo.
                  </td>
                </tr>
              ) : (
                horarios.map((h) => (
                  <tr key={h.id}>
                    <td>
                      <span style={{ fontWeight: '500' }}>
                        {new Date(h.fecha).toLocaleDateString()}
                      </span>
                    </td>
                    {isAdmin && (
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ padding: '6px', backgroundColor: 'var(--card-bg)', borderRadius: '50%' }}>
                            <User size={16} color="var(--text-muted)" />
                          </div>
                          <div>
                            <div style={{ fontWeight: '600' }}>{h.trabajadores?.nombre}</div>
                          </div>
                        </div>
                      </td>
                    )}
                    <td>
                      <div style={{ display: 'inline-flex', padding: '4px 8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', borderRadius: '4px', fontSize: '13px', fontWeight: '600' }}>
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

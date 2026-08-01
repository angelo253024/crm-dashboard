import React, { useState, useEffect } from 'react';
import { Users, Plus, UserPlus, X } from 'lucide-react';
import { supabase } from '../supabase';

export default function Trabajadores() {
  const [trabajadores, setTrabajadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTrabajador, setNewTrabajador] = useState({ nombre: '', rol: 'Trabajador' });

  useEffect(() => {
    fetchTrabajadores();
  }, []);

  const fetchTrabajadores = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('trabajadores')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching trabajadores:', error);
    } else {
      setTrabajadores(data);
    }
    setLoading(false);
  };

  const handleAddTrabajador = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from('trabajadores')
      .insert([{ nombre: newTrabajador.nombre, rol: newTrabajador.rol, estado: 'Activo' }])
      .select();

    if (error) {
      console.error('Error adding trabajador:', error);
      alert('Hubo un error al agregar el usuario.');
    } else {
      setTrabajadores([data[0], ...trabajadores]);
      setShowModal(false);
      setNewTrabajador({ nombre: '', rol: 'Trabajador' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 className="text-h2">Equipo de Trabajo</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <Users size={20} className="text-muted" />
              <span className="text-body font-semibold">Total de Usuarios/Trabajadores: {trabajadores.length}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-secondary" onClick={() => alert("Función para Asignar Servicio pronto disponible")}>
              Asignar Servicio
            </button>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <UserPlus size={16} /> Agregar Usuario
            </button>
          </div>
        </div>
        
        <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)' }}>
              <tr>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>ID</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Nombre</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Rol</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center' }}>Cargando usuarios...</td></tr>
              ) : trabajadores.length === 0 ? (
                <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center' }}>No hay trabajadores registrados.</td></tr>
              ) : (
                trabajadores.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-muted)' }}>{t.id.substring(0, 8)}...</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500' }}>{t.nombre}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>{t.rol}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      <span className={`status-badge ${t.estado === 'Activo' || t.estado === 'Disponible' ? 'status-won' : 'status-open'}`}>
                        {t.estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--card-bg)', padding: '24px', borderRadius: 'var(--radius-lg)', width: '400px', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <h2 className="text-h2">Agregar Nuevo Usuario</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddTrabajador} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Nombre Completo</label>
                <input 
                  type="text" 
                  value={newTrabajador.nombre}
                  onChange={(e) => setNewTrabajador({...newTrabajador, nombre: e.target.value})}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Rol</label>
                <select 
                  value={newTrabajador.rol}
                  onChange={(e) => setNewTrabajador({...newTrabajador, rol: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                >
                  <option value="Trabajador">Trabajador (Lavador)</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>
              
              <button type="submit" className="btn-primary" style={{ marginTop: '16px', justifyContent: 'center' }}>
                Guardar Usuario
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

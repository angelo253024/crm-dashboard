import React, { useState, useEffect } from 'react';
import { Users, Plus, UserPlus, X, Edit2 } from 'lucide-react';
import { supabase } from '../supabase';

export default function Trabajadores() {
  const [trabajadores, setTrabajadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Para saber si estamos creando o editando
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({ 
    nombre: '', 
    rol: 'Trabajador',
    password: '',
    foto_url: ''
  });

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

  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ nombre: '', rol: 'Trabajador', password: '', foto_url: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (t) => {
    setIsEditing(true);
    setEditingId(t.id);
    setFormData({ 
      nombre: t.nombre || '', 
      rol: t.rol || 'Trabajador', 
      password: t.password || '',
      foto_url: t.foto_url || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
      nombre: formData.nombre,
      rol: formData.rol,
      password: formData.password,
      foto_url: formData.foto_url
    };

    if (isEditing) {
      const { data, error } = await supabase
        .from('trabajadores')
        .update(payload)
        .eq('id', editingId)
        .select();

      if (error) {
        alert('Hubo un error al editar el usuario.');
        console.error(error);
      } else {
        setTrabajadores(trabajadores.map(t => t.id === editingId ? data[0] : t));
        setShowModal(false);
      }
    } else {
      payload.estado = 'Activo';
      const { data, error } = await supabase
        .from('trabajadores')
        .insert([payload])
        .select();

      if (error) {
        alert('Hubo un error al agregar el usuario.');
        console.error(error);
      } else {
        setTrabajadores([data[0], ...trabajadores]);
        setShowModal(false);
      }
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
            <button className="btn-primary" onClick={handleOpenAdd}>
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
                <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center' }}>Cargando usuarios...</td></tr>
              ) : trabajadores.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center' }}>No hay trabajadores registrados.</td></tr>
              ) : (
                trabajadores.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-muted)' }}>{t.id.substring(0, 8)}...</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {t.foto_url ? (
                          <img src={t.foto_url} alt="User" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--accent-cyan)', color: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
                            {t.nombre ? t.nombre.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                        {t.nombre}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>{t.rol}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      <span className={`status-badge ${t.estado === 'Activo' || t.estado === 'Disponible' ? 'status-won' : 'status-open'}`}>
                        {t.estado}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                       <button onClick={() => handleOpenEdit(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-blue)' }}>
                         <Edit2 size={16} />
                       </button>
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
          <div style={{ backgroundColor: 'var(--card-bg)', padding: '24px', borderRadius: 'var(--radius-lg)', width: '450px', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <h2 className="text-h2">{isEditing ? 'Editar Usuario' : 'Agregar Nuevo Usuario'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Nombre Completo</label>
                <input 
                  type="text" 
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Rol</label>
                <select 
                  value={formData.rol}
                  onChange={(e) => setFormData({...formData, rol: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                >
                  <option value="Trabajador">Trabajador (Lavador)</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Contraseña</label>
                <input 
                  type="text" 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                  placeholder="Contraseña para acceso"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>URL de Foto de Perfil (Opcional)</label>
                <input 
                  type="url" 
                  value={formData.foto_url}
                  onChange={(e) => setFormData({...formData, foto_url: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                  placeholder="https://ejemplo.com/foto.jpg"
                />
              </div>
              
              <button type="submit" className="btn-primary" style={{ marginTop: '16px', justifyContent: 'center' }}>
                {isEditing ? 'Guardar Cambios' : 'Guardar Usuario'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

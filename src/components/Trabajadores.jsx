import React, { useState, useEffect } from 'react';
import { Users, Plus, UserPlus, X, Edit2, Trash2 } from 'lucide-react';
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
    foto_url: '',
    pregunta_seguridad: '',
    respuesta_seguridad: ''
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
    setFormData({ 
      nombre: '', 
      rol: 'Trabajador', 
      password: '', 
      foto_url: '',
      pregunta_seguridad: '',
      respuesta_seguridad: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (t) => {
    setIsEditing(true);
    setEditingId(t.id);
    setFormData({ 
      nombre: t.nombre || '', 
      rol: t.rol || 'Trabajador', 
      password: t.password || '',
      foto_url: t.foto_url || '',
      pregunta_seguridad: t.pregunta_seguridad || '',
      respuesta_seguridad: t.respuesta_seguridad || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
      nombre: formData.nombre,
      rol: formData.rol,
      password: formData.password,
      foto_url: formData.foto_url,
      pregunta_seguridad: formData.pregunta_seguridad,
      respuesta_seguridad: formData.respuesta_seguridad
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

  const handleDelete = async (id, nombre) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar al usuario ${nombre}?`)) {
      const { error } = await supabase
        .from('trabajadores')
        .delete()
        .eq('id', id);

      if (error) {
        alert('Hubo un error al eliminar el usuario.');
        console.error(error);
      } else {
        setTrabajadores(trabajadores.filter(t => t.id !== id));
      }
    }
  };

  const [activeTab, setActiveTab] = useState('directorio');

  const renderDirectorio = () => (
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
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <button onClick={() => handleOpenEdit(t)} title="Editar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-blue)' }}>
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(t.id, t.nombre)} title="Eliminar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red, #ef4444)' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderHorarios = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ padding: '16px', backgroundColor: 'rgba(28, 169, 201, 0.05)', border: '1px solid var(--accent-cyan)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Turnos Pendientes de Hoy</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Asigna horarios de trabajo a tus empleados y revisa si están pendientes o en servicio.</p>
      </div>

      <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)' }}>
            <tr>
              <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Trabajador</th>
              <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Horario Asignado</th>
              <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Estado del Turno</th>
              <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center' }}>Cargando usuarios...</td></tr>
            ) : trabajadores.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center' }}>No hay trabajadores.</td></tr>
            ) : (
              trabajadores.map((t, index) => {
                // Simular algunos turnos pendientes para la UI
                const isPending = index % 2 === 0;
                const statusColor = isPending ? 'var(--accent-cyan)' : 'var(--accent-green)';
                const statusText = isPending ? 'Pendiente' : 'En Servicio';
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
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
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-muted)' }}>
                      08:00 AM - 04:00 PM
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      <span style={{ 
                        display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: '12px', 
                        fontSize: '12px', fontWeight: '600', backgroundColor: `${statusColor}20`, color: statusColor 
                      }}>
                        {statusText}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => alert("Cambiar turno - En desarrollo")}>
                        Asignar Turno
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 className="text-h2">Equipo de Trabajo</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <Users size={20} className="text-muted" />
              <span className="text-body font-semibold">Total de Usuarios/Trabajadores: {trabajadores.length}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-primary" onClick={handleOpenAdd}>
              <UserPlus size={16} /> Agregar Usuario
            </button>
          </div>
        </div>

        {/* Custom Tabs */}
        <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
          <button 
            style={{ 
              background: 'none', border: 'none', padding: '12px 0', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              color: activeTab === 'directorio' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              borderBottom: activeTab === 'directorio' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
              transition: 'all 0.2s ease'
            }}
            onClick={() => setActiveTab('directorio')}
          >
            Directorio de Usuarios
          </button>
          <button 
            style={{ 
              background: 'none', border: 'none', padding: '12px 0', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              color: activeTab === 'horarios' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              borderBottom: activeTab === 'horarios' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
              transition: 'all 0.2s ease'
            }}
            onClick={() => setActiveTab('horarios')}
          >
            Horarios y Turnos Pendientes
          </button>
        </div>
        
        {activeTab === 'directorio' ? renderDirectorio() : renderHorarios()}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, overflowY: 'auto', padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', padding: '24px', borderRadius: 'var(--radius-lg)', width: '500px', boxShadow: 'var(--shadow-soft)', maxHeight: '90vh', overflowY: 'auto' }}>
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

              <div style={{ borderTop: '1px solid var(--border-color)', margin: '8px 0' }}></div>
              <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Seguridad (Recuperación)</h3>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Pregunta de Seguridad</label>
                <input 
                  type="text" 
                  value={formData.pregunta_seguridad}
                  onChange={(e) => setFormData({...formData, pregunta_seguridad: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                  placeholder="Ej. ¿Cuál es el nombre de tu primera mascota?"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Respuesta de Seguridad</label>
                <input 
                  type="text" 
                  value={formData.respuesta_seguridad}
                  onChange={(e) => setFormData({...formData, respuesta_seguridad: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                  placeholder="Respuesta que usará para recuperar contraseña"
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

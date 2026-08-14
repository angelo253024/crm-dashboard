import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Trash2, Edit2, Image as ImageIcon, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../supabase';

export default function AdminServicios() {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form State
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('Lavado Clásico');
  const [precio, setPrecio] = useState('');
  const [disponible, setDisponible] = useState(true);
  const [imagenUrl, setImagenUrl] = useState('');

  const location = useLocation();

  useEffect(() => {
    fetchServicios();
    
    const handleOpenModal = () => openNewModal();
    window.addEventListener('openNewServiceModal', handleOpenModal);

    if (location.state?.openNewModal) {
      openNewModal();
      // Use navigate to clear the router state cleanly
      window.history.replaceState({}, document.title);
    }

    return () => {
      window.removeEventListener('openNewServiceModal', handleOpenModal);
    };
  }, [location.state]);

  const fetchServicios = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('servicios').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching servicios:', error);
    } else {
      let sortedData = data || [];
      sortedData.sort((a, b) => {
        if (a.imagen_url && !b.imagen_url) return -1;
        if (!a.imagen_url && b.imagen_url) return 1;
        return 0;
      });
      setServicios(sortedData);
    }
    setLoading(false);
  };


  const resetForm = () => {
    setNombre('');
    setCategoria('Lavado Clásico');
    setPrecio('');
    setDisponible(true);
    setImagenUrl('');
    setEditingId(null);
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (servicio) => {
    setNombre(servicio.nombre || '');
    setCategoria(servicio.categoria || 'Lavado Clásico');
    setPrecio(servicio.precio || '');
    setDisponible(servicio.disponible !== false); // Default true if undefined
    setImagenUrl(servicio.imagen_url || '');
    setEditingId(servicio.id);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const serviceData = {
      nombre,
      categoria,
      precio: parseFloat(precio),
      disponible,
      imagen_url: imagenUrl
    };

    let error;

    if (editingId) {
      const { error: updateError } = await supabase
        .from('servicios')
        .update(serviceData)
        .eq('id', editingId);
      error = updateError;
      
      if (!error) {
        await supabase.from('notificaciones').insert([{
          mensaje: `Servicio modificado: ${nombre}`,
          tipo: 'warning'
        }]);
      }
    } else {
      const { error: insertError } = await supabase
        .from('servicios')
        .insert([serviceData]);
      error = insertError;

      if (!error) {
        await supabase.from('notificaciones').insert([{
          mensaje: `Nuevo servicio agregado: ${nombre}`,
          tipo: 'success'
        }]);
      }
    }

    if (error) {
      console.error('Error saving:', error);
      alert(`Error al guardar: ${error.message || JSON.stringify(error)}\n\nDetalles técnicos: Verifica los permisos RLS o la estructura de la tabla.`);
    } else {
      setShowModal(false);
      resetForm();
      fetchServicios();
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Seguro que deseas eliminar este servicio?')) {
      const { error } = await supabase.from('servicios').delete().eq('id', id);
      if (error) {
        alert('Error al eliminar');
      } else {
        fetchServicios();
      }
    }
  };

  const toggleDisponible = async (id, currentStatus) => {
    const { error } = await supabase
      .from('servicios')
      .update({ disponible: !currentStatus })
      .eq('id', id);
    if (!error) {
      fetchServicios();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h2 className="text-h2">Administración de Servicios</h2>
            <p className="text-muted text-small">Gestiona los servicios que aparecerán en el catálogo público.</p>
          </div>
          <button className="btn-primary" onClick={openNewModal}>
            <Plus size={16} /> Nuevo Servicio
          </button>
        </div>
        
        {loading ? (
           <p style={{ textAlign: 'center', padding: '24px' }}>Cargando servicios...</p>
        ) : servicios.length === 0 ? (
           <p style={{ textAlign: 'center', padding: '24px' }}>No hay servicios registrados. Agrega uno nuevo.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            {servicios.map((s) => (
              <div key={s.id} style={{ 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-lg)', 
                overflow: 'hidden',
                backgroundColor: 'var(--bg-color)',
                position: 'relative'
              }}>
                <div style={{ height: '160px', backgroundColor: 'var(--card-bg)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {s.imagen_url ? (
                    <img src={s.imagen_url} alt={s.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ImageIcon size={48} className="text-muted" opacity={0.5} />
                  )}
                </div>
                
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 className="text-body font-semibold" style={{ lineHeight: '1.2' }}>{s.nombre}</h3>
                    <span className="font-bold" style={{ color: 'var(--accent-green)' }}>Bs.{s.precio}</span>
                  </div>
                  <div className="text-small text-muted" style={{ marginBottom: '16px' }}>{s.categoria}</div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <button 
                      onClick={() => toggleDisponible(s.id, s.disponible !== false)}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px',
                        color: s.disponible !== false ? 'var(--accent-green)' : 'var(--accent-red)',
                        background: 'none', border: 'none', cursor: 'pointer'
                      }}
                    >
                      {s.disponible !== false ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      {s.disponible !== false ? 'Disponible' : 'Agotado'}
                    </button>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => openEditModal(s)} style={{ color: 'var(--accent-cyan)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(s.id)} style={{ color: 'var(--accent-red)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', padding: '20px', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '480px', maxHeight: '92vh', overflowY: 'auto' }}>
            <h2 className="text-h2" style={{ marginBottom: '20px' }}>
              {editingId ? 'Editar Servicio' : 'Nuevo Servicio'}
            </h2>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="form-group">
                <label>Nombre del Servicio</label>
                <input 
                  type="text" 
                  value={nombre} 
                  onChange={(e) => setNombre(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', marginTop: '8px' }}
                />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <div className="form-group" style={{ flex: '1 1 180px' }}>
                  <label>Categoría</label>
                  <select 
                    value={categoria} 
                    onChange={(e) => setCategoria(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', marginTop: '8px' }}
                  >
                    <option value="Lavado Clásico">Lavado Clásico</option>
                    <option value="Lavado Premium">Lavado Premium</option>
                    <option value="Lavado Bicis y Motos">Lavado Bicis y Motos</option>
                    <option value="Personaliza tu lavado">Personaliza tu lavado</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                
                <div className="form-group" style={{ flex: '1 1 140px' }}>
                  <label>Precio (Bs.)</label>
                  <input 
                    type="number" 
                    value={precio} 
                    onChange={(e) => setPrecio(e.target.value)} 
                    required 
                    min="0"
                    step="0.1"
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', marginTop: '8px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>URL de la Imagen (Link externo, Opcional)</label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', alignItems: 'center' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '4px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {imagenUrl ? (
                      <img src={imagenUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} onLoad={(e) => { e.target.style.display = 'block'; }} />
                    ) : (
                      <ImageIcon size={24} className="text-muted" />
                    )}
                  </div>
                  <input 
                    type="url" 
                    placeholder="https://ejemplo.com/imagen.jpg"
                    value={imagenUrl}
                    onChange={(e) => setImagenUrl(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <input 
                  type="checkbox" 
                  id="disponible" 
                  checked={disponible} 
                  onChange={(e) => setDisponible(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="disponible" style={{ margin: 0, cursor: 'pointer' }}>Servicio Activo / Disponible</label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar Servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

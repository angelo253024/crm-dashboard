import React, { useState, useEffect } from 'react';
import { Plus, Tag as TagIcon, Edit, Trash2, X, Calendar, Clock } from 'lucide-react';
import { supabase } from '../supabase';

export default function AdminPromos() {
  const [promos, setPromos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [formData, setFormData] = useState(getInitialFormData());

  function getInitialFormData() {
    return {
      titulo: '',
      descripcion: '',
      tipo: 'descuento',
      descuento_porcentaje: '',
      precio_combo: '',
      servicio_id: '',
      es_temporal: false,
      fecha_inicio: '',
      fecha_fin: '',
      activa: true
    };
  }

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [promosRes, serviciosRes] = await Promise.all([
      supabase.from('promociones').select('*').order('created_at', { ascending: false }),
      supabase.from('servicios').select('id, nombre, precio')
    ]);

    if (promosRes.data) setPromos(promosRes.data);
    if (serviciosRes.data) setServicios(serviciosRes.data);
    setLoading(false);
  };

  const handleOpenModal = (promo = null) => {
    if (promo) {
      setEditingPromo(promo);
      setFormData({
        titulo: promo.titulo,
        descripcion: promo.descripcion || '',
        tipo: promo.tipo,
        descuento_porcentaje: promo.descuento_porcentaje || '',
        precio_combo: promo.precio_combo || '',
        servicio_id: promo.servicio_id || '',
        es_temporal: promo.es_temporal,
        fecha_inicio: promo.fecha_inicio ? promo.fecha_inicio.substring(0, 16) : '',
        fecha_fin: promo.fecha_fin ? promo.fecha_fin.substring(0, 16) : '',
        activa: promo.activa
      });
    } else {
      setEditingPromo(null);
      setFormData(getInitialFormData());
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const payload = { ...formData };
    
    // Clean up payload based on type
    if (payload.tipo === 'descuento') {
      payload.precio_combo = null;
      if (!payload.descuento_porcentaje) return alert('Debes especificar el porcentaje de descuento');
      if (!payload.servicio_id) return alert('Debes seleccionar un servicio');
    } else {
      payload.descuento_porcentaje = null;
      payload.servicio_id = null;
      if (!payload.precio_combo) return alert('Debes especificar el precio del combo');
    }

    if (!payload.es_temporal) {
      payload.fecha_inicio = null;
      payload.fecha_fin = null;
    } else {
      if (!payload.fecha_inicio || !payload.fecha_fin) {
        return alert('Debes especificar fecha de inicio y fin para promos temporales.');
      }
    }

    if (editingPromo) {
      const { error } = await supabase.from('promociones').update(payload).eq('id', editingPromo.id);
      if (error) alert('Error al actualizar promo');
    } else {
      const { error } = await supabase.from('promociones').insert([payload]);
      if (error) alert('Error al crear promo');
    }
    
    setShowModal(false);
    fetchData();
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta promoción?')) {
      await supabase.from('promociones').delete().eq('id', id);
      fetchData();
    }
  };

  const toggleStatus = async (promo) => {
    await supabase.from('promociones').update({ activa: !promo.activa }).eq('id', promo.id);
    fetchData();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="text-h1">Promociones</h1>
          <p className="text-body text-muted">Gestiona descuentos y combos para tus clientes.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary" style={{ backgroundColor: 'var(--accent-green)', color: '#000' }}>
          <Plus size={18} /> Crear Promo
        </button>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <h2 className="text-h2">Listado de Promociones</h2>
        </div>
        
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando promociones...</div>
        ) : promos.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <TagIcon size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
            <p>No tienes promociones creadas.</p>
          </div>
        ) : (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '550px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '16px 24px', fontWeight: '600' }}>Promoción</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600' }}>Tipo/Valor</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600' }}>Vigencia</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600' }}>Estado</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {promos.map(promo => (
                  <tr key={promo.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>{promo.titulo}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{promo.descripcion}</div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      {promo.tipo === 'descuento' ? (
                        <div>
                          <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(28, 169, 201, 0.1)', color: 'var(--accent-cyan)', fontWeight: 'bold', fontSize: '12px' }}>
                            {promo.descuento_porcentaje}% OFF
                          </span>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {promo.servicios ? promo.servicios.nombre : 'Servicio específico'}
                          </div>
                        </div>
                      ) : (
                        <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(46, 204, 113, 0.1)', color: '#2ecc71', fontWeight: 'bold', fontSize: '12px' }}>
                          Combo: Bs {promo.precio_combo}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      {promo.es_temporal ? (
                        <div>
                          <div>Hasta: {new Date(promo.fecha_fin).toLocaleDateString()}</div>
                          <div style={{ fontSize: '11px', color: '#f1c40f' }}>Temporal</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Permanente</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <button 
                        onClick={() => toggleStatus(promo)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', border: 'none',
                          backgroundColor: promo.activa ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)',
                          color: promo.activa ? '#2ecc71' : '#e74c3c'
                        }}
                      >
                        {promo.activa ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {promo.activa ? 'Activa' : 'Inactiva'}
                      </button>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleOpenModal(promo)} style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer' }}>
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(promo.id)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', padding: '20px', borderRadius: '16px', width: '100%', maxWidth: '580px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)', maxHeight: '92vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className="text-h2">{editingPromo ? 'Modificar Promo' : 'Crear Promo'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '6px' }}>Título de la Promo</label>
                <input type="text" value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} required style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }} placeholder="Ej. Lunes de Locura" />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '6px' }}>Descripción Corta (Opcional)</label>
                <input type="text" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }} />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ flex: '1 1 180px' }}>
                  <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '6px' }}>Tipo de Promo</label>
                  <select value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}>
                    <option value="descuento">Descuento a Servicio</option>
                    <option value="combo">Combo Especial</option>
                  </select>
                </div>

                {formData.tipo === 'descuento' ? (
                  <div style={{ flex: '1 1 140px' }}>
                    <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '6px' }}>% de Descuento</label>
                    <input type="number" min="1" max="100" value={formData.descuento_porcentaje} onChange={e => setFormData({...formData, descuento_porcentaje: e.target.value})} required={formData.tipo === 'descuento'} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }} placeholder="Ej. 20" />
                  </div>
                ) : (
                  <div style={{ flex: '1 1 140px' }}>
                    <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '6px' }}>Precio del Combo (Bs)</label>
                    <input type="number" min="1" value={formData.precio_combo} onChange={e => setFormData({...formData, precio_combo: e.target.value})} required={formData.tipo === 'combo'} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }} placeholder="Ej. 150" />
                  </div>
                )}
              </div>

              {formData.tipo === 'descuento' && (
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '6px' }}>Aplica al Servicio:</label>
                  <select value={formData.servicio_id} onChange={e => setFormData({...formData, servicio_id: e.target.value})} required style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}>
                    <option value="">Selecciona un servicio...</option>
                    {servicios.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre} (Bs {s.precio})</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: '16px' }}>
                  <input type="checkbox" checked={formData.es_temporal} onChange={e => setFormData({...formData, es_temporal: e.target.checked})} style={{ width: '18px', height: '18px' }} />
                  <span style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: '500' }}>Promoción Temporal (Fecha límite)</span>
                </label>

                {formData.es_temporal && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', backgroundColor: 'var(--bg-color)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ flex: '1 1 180px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Inicio</label>
                      <input type="datetime-local" value={formData.fecha_inicio} onChange={e => setFormData({...formData, fecha_inicio: e.target.value})} required={formData.es_temporal} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
                    </div>
                    <div style={{ flex: '1 1 180px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Fin</label>
                      <input type="datetime-local" value={formData.fecha_fin} onChange={e => setFormData({...formData, fecha_fin: e.target.value})} required={formData.es_temporal} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary" style={{ backgroundColor: 'var(--accent-green)', color: '#000' }}>
                  {editingPromo ? 'Guardar Cambios' : 'Crear Promoción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

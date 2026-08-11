import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '../supabase';

export default function EditPercentagesModal({ currentUser, onClose }) {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Guardamos un clon del estado inicial para saber qué cambió exactamente
  const [originalServicios, setOriginalServicios] = useState([]);

  useEffect(() => {
    fetchServicios();
  }, []);

  const fetchServicios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('servicios')
      .select('id, nombre, categoria, comision_porcentaje')
      .order('nombre', { ascending: true });
    
    if (error) {
      alert("Error al cargar servicios: " + error.message);
    } else {
      const formattedData = data.map(s => ({
        ...s,
        comision_porcentaje: (s.comision_porcentaje * 100).toFixed(0) // convertir 0.50 a 50
      }));
      setServicios(formattedData);
      setOriginalServicios(JSON.parse(JSON.stringify(formattedData)));
    }
    setLoading(false);
  };

  const handlePercentageChange = (id, newPercentage) => {
    let val = newPercentage.replace(/\D/g, ''); // solo números
    if (val !== '') {
      let num = parseInt(val, 10);
      if (num < 0) num = 0;
      if (num > 100) num = 100;
      val = num.toString();
    }
    
    setServicios(prev => prev.map(s => s.id === id ? { ...s, comision_porcentaje: val } : s));
  };

  const handleSave = async () => {
    // Buscar diferencias
    const changes = [];
    for (const current of servicios) {
      const original = originalServicios.find(o => o.id === current.id);
      if (original && original.comision_porcentaje !== current.comision_porcentaje) {
        if (current.comision_porcentaje === '') {
          return alert(`El porcentaje para "${current.nombre}" no puede estar vacío.`);
        }
        changes.push({
          servicio_id: current.id,
          nombre: current.nombre,
          oldVal: Number(original.comision_porcentaje) / 100,
          newVal: Number(current.comision_porcentaje) / 100
        });
      }
    }

    if (changes.length === 0) {
      alert("No hay cambios para guardar.");
      return;
    }

    const confirmMsg = `¿Estás seguro de modificar ${changes.length} porcentaje(s)?\n\nEstos cambios aplicarán ÚNICAMENTE a las comisiones de servicios que se completen a partir de este momento. El historial financiero permanecerá intacto.`;
    
    if (!window.confirm(confirmMsg)) return;

    setSaving(true);
    
    try {
      for (const change of changes) {
        // 1. Actualizar el porcentaje en la tabla servicios
        const { error: updateError } = await supabase
          .from('servicios')
          .update({ comision_porcentaje: change.newVal })
          .eq('id', change.servicio_id);
          
        if (updateError) throw updateError;

        // 2. Insertar en auditoría
        await supabase
          .from('auditoria_porcentajes')
          .insert([{
            servicio_id: change.servicio_id,
            administrador_id: currentUser.id,
            porcentaje_anterior: change.oldVal,
            porcentaje_nuevo: change.newVal
          }]);
      }
      
      alert("Porcentajes actualizados exitosamente.");
      onClose(); // Cerrar modal después de éxito
    } catch (err) {
      console.error(err);
      alert("Ocurrió un error al guardar los porcentajes: " + err.message);
    }
    
    setSaving(false);
  };

  return createPortal(
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000, padding: '24px' }}>
      <div style={{ backgroundColor: 'var(--bg-color)', width: '100%', maxWidth: '700px', maxHeight: '90vh', borderRadius: '16px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--card-bg)' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px' }}>
            Editar Porcentajes de Comisión
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          
          <div style={{ backgroundColor: 'rgba(28, 169, 201, 0.1)', border: '1px solid var(--accent-cyan)', borderRadius: '8px', padding: '16px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Info style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} size={20} />
            <div>
              <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>Historial Inmutable Garantizado</p>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.5' }}>
                Al modificar un porcentaje, solo aplicará para las futuras órdenes que se marquen como "Completadas". Las comisiones históricas ya ganadas por los trabajadores no sufrirán ningún cambio.
              </p>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando servicios...</div>
          ) : (
            <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Servicio</th>
                    <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Categoría</th>
                    <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)', width: '150px' }}>Comisión (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {servicios.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: i === servicios.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500' }}>{s.nombre}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'inline-block', padding: '4px 8px', backgroundColor: s.categoria.toLowerCase().includes('lavado') ? 'rgba(46, 204, 113, 0.1)' : 'rgba(241, 196, 15, 0.1)', color: s.categoria.toLowerCase().includes('lavado') ? '#2ecc71' : '#f1c40f', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                          {s.categoria}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input 
                            type="text" 
                            value={s.comision_porcentaje} 
                            onChange={(e) => handlePercentageChange(s.id, e.target.value)}
                            style={{ 
                              width: '60px', 
                              padding: '8px', 
                              borderRadius: '6px', 
                              border: '1px solid var(--border-color)', 
                              backgroundColor: 'var(--bg-color)', 
                              color: 'var(--text-main)',
                              textAlign: 'center',
                              fontWeight: 'bold'
                            }} 
                          />
                          <span style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: 'var(--card-bg)' }}>
          <button onClick={onClose} disabled={saving} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: saving ? 'not-allowed' : 'pointer' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving || loading} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--accent-cyan)', color: '#fff', fontWeight: 'bold', cursor: (saving || loading) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

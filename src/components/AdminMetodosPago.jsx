import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { QrCode, Upload, Save, CheckCircle, Image as ImageIcon } from 'lucide-react';

export default function AdminMetodosPago() {
  const [configId, setConfigId] = useState(null);
  const [qrUrl, setQrUrl] = useState('');
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('configuraciones_pago').select('*').limit(1).single();
    if (data) {
      setConfigId(data.id);
      setQrUrl(data.qr_image_url);
      setPreview(data.qr_image_url);
    }
    setLoading(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    try {
      if (configId) {
        await supabase.from('configuraciones_pago').update({ qr_image_url: preview }).eq('id', configId);
      } else {
        const { data } = await supabase.from('configuraciones_pago').insert([{ qr_image_url: preview }]).select();
        if (data && data[0]) setConfigId(data[0].id);
      }
      setQrUrl(preview);
      setSuccessMsg('Imagen QR actualizada correctamente. Todos los trabajadores verán el nuevo QR al instante.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar la imagen.");
    }
    setSaving(false);
  };

  if (loading) {
    return <div style={{ padding: '24px' }}>Cargando configuración...</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <QrCode size={28} color="var(--accent-green)" />
          Métodos de Pago
        </h1>
        <p className="text-muted" style={{ marginTop: '8px' }}>
          Configura las opciones de cobro que verán los trabajadores al finalizar un servicio.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* Opción 1: QR */}
        <div className="card">
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '24px' }}>
            <h2 className="text-h2" style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Opción 1: Pago por QR
            </h2>
            <p className="text-muted text-body" style={{ marginTop: '4px' }}>Sube la imagen del código QR a donde quieres que los clientes envíen el dinero.</p>
          </div>

          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <div style={{ width: '100%', maxWidth: '300px', aspectRatio: '1/1', backgroundColor: 'var(--bg-color)', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                {preview ? (
                  <img src={preview} alt="QR Code" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <ImageIcon size={48} style={{ opacity: 0.3, margin: '0 auto 8px auto' }} />
                    <p style={{ fontSize: '13px' }}>Sin imagen QR</p>
                  </div>
                )}
              </div>
            </div>

            <div style={{ flex: 1, minWidth: '250px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Seleccionar nueva imagen</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload}
                    style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                  />
                  <div style={{ padding: '12px 24px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-main)', fontWeight: '500' }}>
                    <Upload size={18} /> Subir desde dispositivo
                  </div>
                </div>
              </div>
              
              <div style={{ marginTop: 'auto' }}>
                <button 
                  className="btn-primary" 
                  onClick={handleSave} 
                  disabled={saving || preview === qrUrl}
                  style={{ width: '100%', opacity: (saving || preview === qrUrl) ? 0.6 : 1 }}
                >
                  <Save size={18} /> {saving ? 'Guardando...' : 'Guardar y Activar QR'}
                </button>
              </div>

              {successMsg && (
                <div style={{ padding: '12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={16} /> {successMsg}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Opción 2: Efectivo */}
        <div className="card" style={{ opacity: 0.8 }}>
          <div style={{ paddingBottom: '8px' }}>
            <h2 className="text-h2" style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Opción 2: Pago en Efectivo
            </h2>
            <p className="text-muted text-body" style={{ marginTop: '4px' }}>Esta opción siempre está activa por defecto. No requiere configuración adicional. El trabajador ingresará el monto recibido y el sistema calculará el cambio automáticamente.</p>
          </div>
        </div>

      </div>
    </div>
  );
}

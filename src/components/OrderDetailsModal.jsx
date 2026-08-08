import React from 'react';
import { X, MapPin } from 'lucide-react';
import OrderTimeline from './OrderTimeline';

export default function OrderDetailsModal({ reserva, servicios, onClose }) {
  if (!reserva) return null;

  // Reconstruct main and extra services
  const mainService = servicios.find(s => s.id === reserva.servicio_id);
  const extraMatch = (reserva.vehiculo || '').match(/\(Adicionales:\s*(.*)\)/);
  const extraServicesNames = extraMatch ? extraMatch[1].split(', ') : [];
  const extraServices = extraServicesNames.map(name => servicios.find(s => s.nombre === name)).filter(Boolean);

  const vehicleName = (reserva.vehiculo || '').split(' (Adicionales:')[0];
  const clientName = (reserva.cliente_nombre || reserva.cliente || '').split(' - Tel: ')[0];
  const clientPhone = (reserva.cliente_nombre || reserva.cliente || '').split(' - Tel: ')[1] || 'No registrado';

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px' }}>
      <div className="service-glass-card" style={{ padding: '32px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', animation: 'fadeUp 0.3s ease-out forwards' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
             DETALLE DEL SERVICIO
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Info Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ padding: '12px', backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Código de la reserva</div>
            <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>#{reserva.id.toString().substring(0,8).toUpperCase()}</div>
          </div>
          <div style={{ padding: '12px', backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Estado</div>
            <div style={{ fontWeight: 'bold', color: 'var(--accent-green)', textTransform: 'uppercase' }}>{reserva.estado_reserva?.replace('_', ' ') || reserva.estado || 'Completado'}</div>
          </div>
          <div style={{ padding: '12px', backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Fecha y Hora</div>
            <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{String(reserva.fecha_reserva || reserva.fecha || '').split('T')[0]} {String(reserva.hora_reserva || reserva.hora || '').substring(0, 5)}</div>
          </div>
          <div style={{ padding: '12px', backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Método de Pago</div>
            <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{reserva.payment_method === 'QR' ? 'QR' : (reserva.payment_method === 'EFECTIVO' ? 'Efectivo' : 'Pendiente / Efectivo')}</div>
          </div>
        </div>

        {/* Client & Worker Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ padding: '16px', backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '12px' }}>Información del Cliente y Vehículo</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
               <div><span style={{ color: 'var(--text-muted)' }}>Cliente:</span> <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{clientName}</span></div>
               <div><span style={{ color: 'var(--text-muted)' }}>WhatsApp:</span> <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{clientPhone}</span></div>
               <div><span style={{ color: 'var(--text-muted)' }}>Vehículo:</span> <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{vehicleName}</span></div>
               <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Dirección:</span> <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{reserva.ubicacion_gps || 'No registrada'}</span>
                  </div>
                  {reserva.ubicacion_gps && reserva.ubicacion_gps.includes(',') && (
                    <button style={{ marginLeft: '12px', padding: '4px 8px', backgroundColor: 'rgba(28, 169, 201, 0.1)', color: 'var(--accent-cyan)', border: '1px solid rgba(28, 169, 201, 0.3)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} /> Ver en el mapa
                    </button>
                  )}
               </div>
            </div>
          </div>
        </div>

        {/* Services Render */}
        <div style={{ backgroundColor: 'var(--card-bg)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '12px', textTransform: 'uppercase' }}>Servicios Realizados</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '8px', backgroundColor: 'var(--bg-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontWeight: '500' }}>
               <span style={{ color: 'var(--accent-green)' }}>✔</span> {mainService?.nombre || reserva.servicio || 'Servicio Principal'}
            </div>
            <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>Bs {mainService?.precio || reserva.precio || reserva.precio_total}</div>
          </div>

          {extraServices.length > 0 && (
            <>
              <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)', marginTop: '16px', marginBottom: '8px' }}>Servicios Adicionales</h3>
              {extraServices.map((extra, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '8px', backgroundColor: 'var(--bg-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontWeight: '500' }}>
                     <span style={{ color: 'var(--accent-green)' }}>✔</span> {extra.nombre}
                  </div>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>Bs {extra.precio}</div>
                </div>
              ))}
            </>
          )}

          <div style={{ borderTop: '1px dashed var(--border-color)', margin: '16px 0' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '18px' }}>
            <span style={{ color: 'var(--text-main)' }}>TOTAL PAGADO</span>
            <span style={{ color: 'var(--accent-green)' }}>Bs {reserva.precio_total || reserva.precio}</span>
          </div>
        </div>

        {/* Evidence */}
        <div style={{ padding: '16px', backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '12px' }}>Evidencias del Servicio</h3>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '24px', border: '1px dashed var(--border-color)', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
            No se adjuntaron evidencias.
          </div>
        </div>

        {/* Timeline */}
        <OrderTimeline reserva={reserva} />

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
          <button onClick={onClose} className="glass-pill" style={{ width: '100%', maxWidth: '300px', padding: '12px', justifyContent: 'center' }}>
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}

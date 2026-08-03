import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { MapPin, Navigation, User, Clock, Phone } from 'lucide-react';
import L from 'leaflet';

// Create custom icons based on state
const createCustomIcon = (estado) => {
  let color = '#ef4444'; // default red (inactivo)
  if (estado === 'disponible') color = '#10b981'; // green
  if (estado === 'en_proceso') color = '#facc15'; // yellow
  if (estado === 'ocupado') color = '#f59e0b'; // orange (en camino)
  
  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><span style="color:white;font-size:16px;text-shadow: 0px 1px 2px rgba(0,0,0,0.5);">🛵</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const destinationIcon = L.divIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #3b82f6; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><span style="color:white;font-size:14px;">📍</span></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

export default function Zonas({ user }) {
  const [trabajadores, setTrabajadores] = useState([]);
  const [reservas, setReservas] = useState([]);
  
  const isAdmin = user?.rol === 'Administrador' || user?.rol === 'Admin';
  
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [user]);
  
  const fetchData = async () => {
    if (!user) return;
    
    try {
      // Fetch trabajadores con GPS
      let queryT = supabase.from('trabajadores').select('*').not('latitud', 'is', null).not('longitud', 'is', null);
      if (!isAdmin) {
        queryT = queryT.eq('id', user.id);
      }
      const { data: tData } = await queryT;
      if (tData) setTrabajadores(tData);
      
      // Fetch reservas activas (destinos)
      let queryR = supabase.from('reservas').select('*').in('estado_reserva', ['asignado', 'en_camino', 'en_proceso']);
      if (!isAdmin) {
        queryR = queryR.eq('trabajador_id', user.id);
      }
      const { data: rData } = await queryR;
      if (rData) setReservas(rData);
    } catch(err) {
      console.error(err);
    }
  };

  const centerLat = trabajadores.length > 0 ? trabajadores[0].latitud : -17.7833;
  const centerLng = trabajadores.length > 0 ? trabajadores[0].longitud : -63.1821;

  // Intentamos extraer lat/lng de la ubicación GPS si fue guardada como string "lat,lng"
  const getDestinationCoords = (ubicacionStr) => {
    if (!ubicacionStr) return null;
    const parts = ubicacionStr.split(',');
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 className="text-h2">{isAdmin ? 'Monitoreo en Tiempo Real (GPS)' : 'Mi Ubicación y Rutas'}</h2>
            <p className="text-muted text-small" style={{ marginTop: '4px' }}>
              {isAdmin 
                ? 'Visualiza la ubicación en vivo de todos los trabajadores activos.'
                : 'Esta es tu ubicación actual reportada. Usa Waze o Maps para las direcciones exactas al cliente.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-secondary" onClick={fetchData}>
              <Clock size={16} /> Actualizar Ahora
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981' }}></div> Disponible
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></div> En Camino (Ocupado)
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#facc15' }}></div> En Proceso (Lavando)
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div> Inactivo
           </div>
        </div>

        {/* Contenedor del Mapa de React Leaflet */}
        <div style={{ height: '550px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative', zIndex: 1 }}>
          <MapContainer 
            key={`${centerLat}-${centerLng}`} // re-render on initial center change
            center={[centerLat, centerLng]} 
            zoom={isAdmin ? 12 : 14} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Markers para Trabajadores (Motos) */}
            {trabajadores.map(t => (
              <Marker key={`t-${t.id}`} position={[t.latitud, t.longitud]} icon={createCustomIcon(t.estado_disponibilidad)}>
                <Popup>
                  <div style={{ minWidth: '150px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '15px', borderBottom: '1px solid #ddd', paddingBottom: '6px', marginBottom: '8px' }}>
                      <User size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                      {t.nombre}
                    </div>
                    <div style={{ fontSize: '13px', textTransform: 'capitalize', color: 'var(--text-muted)' }}>
                      Estado: <strong>{t.estado_disponibilidad?.replace('_', ' ')}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                      Última act: {new Date(t.ultima_actualizacion_gps).toLocaleTimeString()}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Markers para Destinos (Reservas Activas) */}
            {reservas.map(r => {
              const coords = getDestinationCoords(r.ubicacion_gps);
              if (!coords) return null; // Si no es coord lat/lng exacta, no lo ponemos como pin
              return (
                <Marker key={`r-${r.id}`} position={coords} icon={destinationIcon}>
                  <Popup>
                    <div style={{ minWidth: '150px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--accent-blue)', marginBottom: '4px' }}>
                        Destino Lavado
                      </div>
                      <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                        <strong>Cliente:</strong> {r.cliente_nombre || 'Pendiente'}
                      </div>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.ubicacion_gps)}`}
                        target="_blank" 
                        rel="noreferrer"
                        style={{ display: 'block', backgroundColor: 'var(--accent-cyan)', color: '#000', padding: '6px', textAlign: 'center', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold', fontSize: '12px' }}
                      >
                        Abrir GPS Destino
                      </a>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

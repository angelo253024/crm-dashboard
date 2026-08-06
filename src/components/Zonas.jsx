import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Clock, User, Phone, Car, RefreshCw, Briefcase, Activity } from 'lucide-react';
import { supabase } from '../supabase';

// Helper: Custom Icons para dar un aspecto "Senior / Premium"
const createCustomIcon = (color, iconHtml) => {
  return new L.DivIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background: linear-gradient(135deg, ${color}, ${color}dd);
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        display: flex;
        justify-content: center;
        align-items: center;
        color: white;
        font-size: 16px;
        transition: transform 0.2s ease;
      ">
        ${iconHtml}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
};

const ICONS = {
  pendiente: createCustomIcon('#f59e0b', '⏳'), // Naranja - Pendiente
  en_proceso: createCustomIcon('#10b981', '📍'), // Verde - En Proceso / En Camino
  trabajador: createCustomIcon('#0ea5e9', '🏍️'), // Azul - Moto
};

// CSS inyectado para popups
const popupStyle = `
  .leaflet-popup-content-wrapper {
    background: #0f172a;
    color: #f8fafc;
    border: 1px solid #334155;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    padding: 0;
    overflow: hidden;
  }
  .leaflet-popup-tip {
    background: #334155;
  }
  .leaflet-popup-content {
    margin: 0;
    width: 250px !important;
  }
`;

// Helper: Parsear coordenadas de la base de datos (Ej: "-17.78, -63.18")
const parseCoords = (ubicacionGps) => {
  if (!ubicacionGps) return null;
  const parts = ubicacionGps.split(',');
  if (parts.length >= 2) {
    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng, isExact: true };
    }
  }
  return null;
};

// Eliminado getFallbackLocation para NO inventar ubicaciones nunca.

export default function Zonas() {
  const [reservas, setReservas] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar datos en tiempo real de Supabase
  const fetchData = async () => {
    setLoading(true);
    
    // 1. Obtener Reservas Activas sin join para evitar errores de Foreign Key
    const { data: resData } = await supabase
      .from('reservas')
      .select('*')
      .in('estado_reserva', ['pendiente', 'asignado', 'en_camino', 'en_proceso']);

    // 2. Obtener Trabajadores
    const { data: trabData } = await supabase
      .from('trabajadores')
      .select('*')
      .eq('rol', 'Trabajador');

    // 3. Obtener Servicios (para asociar nombres localmente)
    const { data: servData } = await supabase
      .from('servicios')
      .select('id, nombre');

    const reservasMapeadas = (resData || []).map(res => {
      const servicioAsociado = (servData || []).find(s => s.id === res.servicio_id);
      return {
        ...res,
        servicios: servicioAsociado ? { nombre: servicioAsociado.nombre } : { nombre: 'Servicio Personalizado' }
      };
    });

    setReservas(reservasMapeadas);
    setTrabajadores(trabData || []);
    setLoading(false);
  };

  useEffect(() => {
    // Inyectar CSS global para el popup oscuro
    const style = document.createElement('style');
    style.innerHTML = popupStyle;
    document.head.appendChild(style);

    fetchData();

    // Configurar el Real-time Listener (si la DB recibe cambios)
    const channel = supabase.channel('realtime_map')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trabajadores' }, fetchData)
      .subscribe();

    return () => {
      document.head.removeChild(style);
      supabase.removeChannel(channel);
    };
  }, []);

  // Construir array de marcadores para Renderizar
  const markers = [];

  // A) Marcadores de Reservas (Trabajos)
  reservas.forEach(res => {
    const coords = parseCoords(res.ubicacion_gps);
    
    // Si la reserva NO tiene coordenadas GPS parseables, no la dibujamos (No inventar)
    if (!coords) return; 

    const icon = res.estado_reserva === 'pendiente' ? ICONS.pendiente : ICONS.en_proceso;
    
    // Buscar al trabajador asignado a esta reserva
    const trabAsignado = trabajadores.find(t => t.id === res.trabajador_id);
    
    markers.push({
      id: `res_${res.id}`,
      lat: coords.lat,
      lng: coords.lng,
      isExact: coords.isExact,
      icon: icon,
      type: 'reserva',
      data: { ...res, trabajador_nombre: trabAsignado ? trabAsignado.nombre : 'Sin Asignar' }
    });
  });

  // B) Marcadores de Trabajadores
  trabajadores.forEach(trab => {
    // Si el trabajador NO transmite GPS (o si le quitaste las coordenadas), no lo mostramos en el mapa
    if (trab.latitud == null || trab.longitud == null) return;
    
    const st = trab.estado_disponibilidad || 'inactivo';
    
    let estadoLabel = 'Inactivo / Fuera';
    let estadoColor = '#ef4444';
    
    if (st === 'disponible') { estadoLabel = 'Disponible'; estadoColor = '#10b981'; }
    else if (st === 'en_proceso') { estadoLabel = 'En Proceso (Lavando)'; estadoColor = '#eab308'; }
    else if (st === 'ocupado') { estadoLabel = 'Ocupado (En camino)'; estadoColor = '#f59e0b'; }

    markers.push({
      id: `trab_${trab.id}`,
      lat: trab.latitud,
      lng: trab.longitud,
      isExact: true, // El GPS del móvil siempre es exacto

      icon: ICONS.trabajador,
      type: 'trabajador',
      data: { ...trab, estadoActual: estadoLabel, colorStatus: estadoColor }
    });
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 className="text-h2">Control de Flota en Tiempo Real</h2>
            <p className="text-muted text-small" style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={14} color="var(--accent-green)" />
              Ubicaciones sincronizadas con Supabase en vivo
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-secondary" onClick={fetchData} disabled={loading} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
              Actualizar Ahora
            </button>
          </div>
        </div>
        
        {/* Leyenda Visual */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
             <span style={{ fontSize: '18px' }}>🏍️</span> Trabajadores
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
             <span style={{ fontSize: '18px' }}>⏳</span> Trabajos Pendientes
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
             <span style={{ fontSize: '18px' }}>📍</span> Trabajos En Proceso
           </div>
        </div>
        
        {/* Contenedor del Mapa de React Leaflet */}
        <div style={{ height: '600px', borderRadius: '16px', overflow: 'hidden', border: '1px solid #334155', position: 'relative', zIndex: 1, boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)' }}>
          <MapContainer 
            center={[-17.7833, -63.1821]} // Santa Cruz de la Sierra por defecto
            zoom={13} 
            style={{ height: '100%', width: '100%', background: '#0f172a' }} // Dark mode base para mapa (tileset oscuro seria ideal, usamos claro base con filtro opcional por CSS, pero aqui lo dejamos estandar)
          >
            {/* TileLayer minimalista (CartoDB Positron) para un estilo más CRM */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            
            {markers.map(marker => (
              <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={marker.icon}>
                <Popup>
                  {marker.type === 'reserva' ? (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155', background: marker.data.estado_reserva === 'pendiente' ? 'linear-gradient(to right, #78350f, #0f172a)' : 'linear-gradient(to right, #064e3b, #0f172a)' }}>
                        <div style={{ fontWeight: '700', fontSize: '15px', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Car size={16} />
                          {marker.data.vehiculo || 'Servicio de Lavado'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{marker.data.estado_reserva.toUpperCase()}</span>
                          <span style={{ fontWeight: 'bold' }}>Bs {marker.data.precio_total}</span>
                        </div>
                      </div>
                      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px' }}>
                          <User size={14} color="#94a3b8" style={{ marginTop: '2px' }} />
                          <span style={{ color: '#e2e8f0' }}>{marker.data.cliente_nombre}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px' }}>
                          <MapPin size={14} color="#94a3b8" style={{ marginTop: '2px' }} />
                          <span style={{ color: '#e2e8f0' }}>
                            {!marker.isExact && <strong style={{ color: '#f59e0b', display: 'block', fontSize: '11px', marginBottom: '2px' }}>Ubicación Aproximada</strong>}
                            {marker.data.ubicacion_gps && !marker.data.ubicacion_gps.includes(',') 
                              ? marker.data.ubicacion_gps 
                              : (marker.isExact ? 'Ubicación GPS Exacta' : 'Centro de la ciudad')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', borderTop: '1px dashed #334155', paddingTop: '12px', marginTop: '4px' }}>
                          <Briefcase size={14} color="#0ea5e9" />
                          <span style={{ color: '#e2e8f0' }}>Asignado a: <strong>{marker.data.trabajador_nombre}</strong></span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155', background: 'linear-gradient(to right, #0c4a6e, #0f172a)' }}>
                        <div style={{ fontWeight: '700', fontSize: '15px', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={16} />
                          {marker.data.nombre}
                        </div>
                        <div style={{ fontSize: '12px', color: '#38bdf8', marginTop: '4px' }}>
                          Personal Lava Móvil
                        </div>
                      </div>
                      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: marker.data.colorStatus }}></div>
                          <span style={{ color: '#e2e8f0' }}>Estado: <strong style={{ color: marker.data.colorStatus }}>{marker.data.estadoActual}</strong></span>
                        </div>
                      </div>
                    </div>
                  )}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

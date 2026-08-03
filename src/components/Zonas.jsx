import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline } from 'react-leaflet';
import { MapPin, Navigation, Clock } from 'lucide-react';

// Componente para capturar clics en el mapa y agregar marcadores
function LocationMarker({ markers, setMarkers }) {
  useMapEvents({
    click(e) {
      const newMarker = {
        id: Date.now(),
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        estado: 'Asignado',
        trabajador: 'Trabajador Pendiente',
      };
      setMarkers([...markers, newMarker]);
    },
  });

  return markers.map((marker) => (
    <Marker key={marker.id} position={[marker.lat, marker.lng]}>
      <Popup>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '150px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
            Servicio a Domicilio
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <MapPin size={14} color="var(--accent-blue)" />
            <span>Lat: {marker.lat.toFixed(4)}, Lng: {marker.lng.toFixed(4)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <Navigation size={14} color="var(--accent-green)" />
            <input 
               type="text" 
               defaultValue={marker.trabajador} 
               style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '2px 4px', width: '100%' }}
               onBlur={(e) => {
                 const newMarkers = markers.map(m => m.id === marker.id ? {...m, trabajador: e.target.value} : m);
                 setMarkers(newMarkers);
               }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <Clock size={14} color="var(--accent-orange)" />
            <select 
               defaultValue={marker.estado} 
               style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '2px 4px', width: '100%' }}
               onChange={(e) => {
                 const newMarkers = markers.map(m => m.id === marker.id ? {...m, estado: e.target.value} : m);
                 setMarkers(newMarkers);
               }}
            >
              <option value="Asignado">Asignado</option>
              <option value="En Camino">En Camino</option>
              <option value="En Proceso">En Proceso</option>
              <option value="Finalizado">Finalizado</option>
            </select>
          </div>
        </div>
      </Popup>
    </Marker>
  ));
}

export default function Zonas() {
  const [markers, setMarkers] = useState([
    { id: 1, lat: -17.7833, lng: -63.1821, trabajador: 'Angelo Miranda', estado: 'En Proceso' }
  ]);
  const [isOptimized, setIsOptimized] = useState(false);

  const handleLimpiar = () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar todas las ubicaciones y rutas del mapa?')) {
      setMarkers([]);
      setIsOptimized(false);
    }
  };

  const handleOptimizar = () => {
    if (markers.length < 2) {
      alert('⚠️ Necesitas al menos 2 servicios en el mapa para poder optimizar una ruta inteligente.');
      return;
    }
    
    // Algoritmo TSP: Nearest Neighbor (Vecino más cercano) para rutas profesionales
    const unvisited = [...markers];
    const optimizedRoute = [];
    
    // Inicia con el primer punto (podría ser la base de operaciones)
    let current = unvisited.shift();
    optimizedRoute.push(current);
    
    while(unvisited.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;
      
      for (let i = 0; i < unvisited.length; i++) {
        // Distancia euclidiana rápida (suficiente para distancias cortas de ciudad)
        const dist = Math.hypot(current.lat - unvisited[i].lat, current.lng - unvisited[i].lng);
        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = i;
        }
      }
      
      current = unvisited.splice(nearestIdx, 1)[0];
      optimizedRoute.push(current);
    }
    
    setMarkers(optimizedRoute);
    setIsOptimized(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 className="text-h2">Mapa y Tracking de Trabajadores</h2>
            <p className="text-muted text-small" style={{ marginTop: '4px' }}>
              Haz clic en cualquier parte del mapa para asignar un nuevo servicio.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-secondary" onClick={handleLimpiar}>
              Limpiar Zonas
            </button>
            <button className="btn-primary" onClick={handleOptimizar} style={{ backgroundColor: 'var(--accent-blue)', color: '#fff' }}>
              <Navigation size={16} /> Optimizar Rutas
            </button>
          </div>
        </div>
        
        {/* Contenedor del Mapa de React Leaflet */}
        <div style={{ height: '550px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative', zIndex: 1 }}>
          <MapContainer 
            center={[-17.7833, -63.1821]} // Santa Cruz de la Sierra por defecto
            zoom={13} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker markers={markers} setMarkers={(m) => { setMarkers(m); setIsOptimized(false); }} />
            
            {isOptimized && markers.length > 1 && (
              <Polyline 
                positions={markers.map(m => [m.lat, m.lng])} 
                color="var(--accent-blue)" 
                weight={4} 
                dashArray="8, 10" 
                opacity={0.8}
              />
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

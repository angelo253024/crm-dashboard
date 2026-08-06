import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline } from 'react-leaflet';
import { MapPin, Navigation, Clock } from 'lucide-react';
import { supabase } from '../supabase';

// Componente para capturar clics en el mapa y agregar marcadores (opcional)
function LocationMarker({ markers, setMarkers }) {
  useMapEvents({
    click(e) {
      // Opcional: podrías insertar directamente en Supabase si quieres que los clics creen reservas
      const newMarker = {
        id: Date.now(),
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        estado: 'Pendiente',
        trabajador: 'Sin asignar',
      };
      setMarkers([...markers, newMarker]);
    },
  });

  const updateMarkerState = async (id, field, value) => {
    // Actualizamos estado local
    const newMarkers = markers.map(m => m.id === id ? {...m, [field]: value} : m);
    setMarkers(newMarkers);
    // Si el id es numérico y corto, probablemente sea temporal, si es uuid, actualizamos en DB
    if (typeof id === 'string' && id.length > 10) {
       const updateData = {};
       if (field === 'estado') {
          updateData.estado = value;
          updateData.estado_reserva = value;
       }
       if (field === 'trabajador') {
          updateData.trabajador = value;
       }
       await supabase.from('reservas').update(updateData).eq('id', id);
    }
  };

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
               defaultValue={marker.trabajador || 'Sin asignar'} 
               style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '2px 4px', width: '100%' }}
               onBlur={(e) => updateMarkerState(marker.id, 'trabajador', e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <Clock size={14} color="var(--accent-orange)" />
            <select 
               defaultValue={marker.estado} 
               style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '2px 4px', width: '100%' }}
               onChange={(e) => updateMarkerState(marker.id, 'estado', e.target.value)}
            >
              <option value="Pendiente">Pendiente</option>
              <option value="Asignado">Asignado</option>
              <option value="En Camino">En Camino</option>
              <option value="En Proceso">En Proceso</option>
              <option value="Finalizado">Finalizado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
        </div>
      </Popup>
    </Marker>
  ));
}

export default function Zonas() {
  const [markers, setMarkers] = useState([]);
  const [isOptimized, setIsOptimized] = useState(false);

  useEffect(() => {
    fetchReservas();
    
    // Suscribirse a cambios en reservas para mantener el mapa actualizado
    const channel = supabase
      .channel('zonas_reservas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, () => {
        fetchReservas();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchReservas = async () => {
    const { data, error } = await supabase
      .from('reservas')
      .select('*, trabajadores(nombre)');
      
    if (error) {
      console.error('Error fetching reservas:', error);
      return;
    }

    if (data) {
      // Filtrar reservas que no estén canceladas (opcional)
      const activeReservas = data.filter(res => {
        const estado = (res.estado_reserva || res.estado || '').toLowerCase();
        return estado !== 'cancelado';
      });

      const newMarkers = activeReservas.map(res => {
        // Coordenadas base (Centro de Santa Cruz)
        let lat = -17.7833;
        let lng = -63.1821;
        
        if (res.ubicacion_gps) {
          const coords = res.ubicacion_gps.split(',');
          if (coords.length === 2) {
            const pLat = parseFloat(coords[0].trim());
            const pLng = parseFloat(coords[1].trim());
            if (!isNaN(pLat) && !isNaN(pLng)) {
              lat = pLat;
              lng = pLng;
            }
          }
        } else {
          // Añadimos un pequeño offset para reservas sin ubicación específica
          // Así no se superponen todas exactamente en el mismo píxel
          lat = lat + (Math.random() - 0.5) * 0.04;
          lng = lng + (Math.random() - 0.5) * 0.04;
        }

        let workerName = 'Sin asignar';
        if (res.trabajadores && res.trabajadores.nombre) {
          workerName = res.trabajadores.nombre;
        } else if (res.trabajador) {
          workerName = res.trabajador;
        }

        let estadoFinal = 'Pendiente';
        const resEstado = (res.estado_reserva || res.estado || '').toLowerCase();
        if (resEstado.includes('asignado')) estadoFinal = 'Asignado';
        else if (resEstado.includes('camino')) estadoFinal = 'En Camino';
        else if (resEstado.includes('proceso')) estadoFinal = 'En Proceso';
        else if (resEstado.includes('fin') || resEstado.includes('completado')) estadoFinal = 'Finalizado';
        else if (resEstado) {
          // Capitalize first letter
          estadoFinal = resEstado.charAt(0).toUpperCase() + resEstado.slice(1);
        }

        return {
          id: res.id,
          lat: lat,
          lng: lng,
          trabajador: workerName,
          estado: estadoFinal
        };
      });

      setMarkers(newMarkers);
    }
  };

  const handleLimpiar = () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar todas las ubicaciones temporales del mapa?')) {
      fetchReservas(); // Volvemos a cargar desde la DB, descartando clics temporales
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
              Ubicaciones sincronizadas con Supabase en vivo. Haz clic en el mapa para pre-visualizar una nueva zona.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-secondary" onClick={handleLimpiar}>
              Recargar Reservas
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

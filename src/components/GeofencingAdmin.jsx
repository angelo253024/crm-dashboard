import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Plus, Trash2, Edit2, Save, X, Eye, EyeOff, Info } from 'lucide-react';
import { geofencingService } from '../services/geofencing/GeofencingService';

// Icono pequeño para los vértices editables
const vertexIcon = new L.DivIcon({
  className: 'custom-vertex-icon',
  html: `<div style="width: 12px; height: 12px; background-color: white; border: 2px solid #1ca9c9; border-radius: 50%; cursor: pointer;"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

// Componente para manejar clics en el mapa y dibujar
function DrawInteraction({ isDrawing, currentPolygon, setCurrentPolygon }) {
  useMapEvents({
    click(e) {
      if (!isDrawing) return;
      setCurrentPolygon(prev => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }]);
    }
  });
  return null;
}

export default function GeofencingAdmin() {
  const [zonas, setZonas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modos: 'view', 'draw', 'edit'
  const [mode, setMode] = useState('view');
  
  // Estado para dibujo nuevo
  const [currentPolygon, setCurrentPolygon] = useState([]);
  const [mousePos, setMousePos] = useState(null);
  
  // Estado para edición
  const [editingZone, setEditingZone] = useState(null);

  // Centro por defecto (Santa Cruz)
  const defaultCenter = [-17.7833, -63.1833];

  useEffect(() => {
    loadZonas();
  }, []);

  const loadZonas = async () => {
    setLoading(true);
    try {
      const data = await geofencingService.getZonas();
      setZonas(data);
    } catch (err) {
      alert("Error cargando zonas");
    }
    setLoading(false);
  };

  const startDrawing = () => {
    setMode('draw');
    setCurrentPolygon([]);
  };

  const cancelDrawing = () => {
    setMode('view');
    setCurrentPolygon([]);
  };

  const finishDrawing = async () => {
    if (currentPolygon.length < 3) {
      alert("Una geocerca debe tener al menos 3 puntos.");
      return;
    }
    const nombre = prompt("Ingresa el nombre para esta Zona de Cobertura:");
    if (!nombre) return;

    try {
      setLoading(true);
      await geofencingService.saveZona({
        nombre,
        coordenadas: currentPolygon,
        activa: true,
        color: '#1ca9c9'
      });
      await loadZonas();
      setMode('view');
      setCurrentPolygon([]);
    } catch (err) {
      alert("Error guardando zona");
    }
    setLoading(false);
  };

  const startEditing = (zona) => {
    setEditingZone(JSON.parse(JSON.stringify(zona))); // Deep copy
    setMode('edit');
  };

  const cancelEditing = () => {
    setEditingZone(null);
    setMode('view');
  };

  const saveEditing = async () => {
    if (!editingZone) return;
    try {
      setLoading(true);
      await geofencingService.saveZona(editingZone);
      await loadZonas();
      setMode('view');
      setEditingZone(null);
    } catch (err) {
      alert("Error actualizando zona");
    }
    setLoading(false);
  };

  const handleVertexDrag = (index, e) => {
    const latlng = e.target.getLatLng();
    setEditingZone(prev => {
      const newCoords = [...prev.coordenadas];
      newCoords[index] = { lat: latlng.lat, lng: latlng.lng };
      return { ...prev, coordenadas: newCoords };
    });
  };

  const deleteZona = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta zona?")) return;
    try {
      setLoading(true);
      await geofencingService.deleteZona(id);
      await loadZonas();
    } catch (err) {
      alert("Error eliminando zona");
    }
    setLoading(false);
  };

  const toggleZona = async (id, currentStatus) => {
    try {
      setLoading(true);
      await geofencingService.toggleZonaStatus(id, !currentStatus);
      await loadZonas();
    } catch (err) {
      alert("Error cambiando estado");
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 200px)' }}>
      {/* Panel Izquierdo: Controles y Lista */}
      <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'var(--card-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={20} color="var(--accent-cyan)" /> Zonas de Cobertura
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
          Las reservas fuera de estas áreas serán bloqueadas (Fase 6).
        </p>

        {mode === 'view' && (
          <button onClick={startDrawing} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--accent-cyan)', color: '#fff', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Plus size={18} /> Dibujar Nueva Zona
          </button>
        )}

        {mode === 'draw' && (
          <div style={{ backgroundColor: 'rgba(28, 169, 201, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--accent-cyan)' }}>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>Modo Dibujo Activo</p>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--text-main)' }}>Haz clic en el mapa para añadir vértices. Necesitas al menos 3 puntos.</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={finishDrawing} disabled={currentPolygon.length < 3} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', backgroundColor: currentPolygon.length < 3 ? 'var(--border-color)' : '#2ecc71', color: '#fff', fontWeight: 'bold', cursor: currentPolygon.length < 3 ? 'not-allowed' : 'pointer' }}>
                Guardar
              </button>
              <button onClick={cancelDrawing} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--text-muted)', backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {mode === 'edit' && editingZone && (
          <div style={{ backgroundColor: 'rgba(241, 196, 15, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid #f1c40f' }}>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#f1c40f', fontWeight: 'bold' }}>Editando: {editingZone.nombre}</p>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--text-main)' }}>Arrastra los puntos blancos en el mapa para ajustar la zona.</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={saveEditing} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', backgroundColor: '#f1c40f', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>
                Guardar
              </button>
              <button onClick={cancelEditing} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--text-muted)', backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
          {loading && <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>Cargando...</div>}
          {!loading && zonas.length === 0 && mode === 'view' && (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No hay zonas registradas.</div>
          )}
          {zonas.map(z => (
            <div key={z.id} style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', opacity: (mode === 'edit' && editingZone?.id !== z.id) ? 0.4 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', fontSize: '14px', color: z.activa ? 'var(--text-main)' : 'var(--text-muted)' }}>{z.nombre}</span>
                <button onClick={() => toggleZona(z.id, z.activa)} disabled={mode !== 'view'} style={{ background: 'none', border: 'none', cursor: mode === 'view' ? 'pointer' : 'not-allowed', color: z.activa ? '#2ecc71' : 'var(--text-muted)' }} title={z.activa ? 'Desactivar' : 'Activar'}>
                  {z.activa ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button onClick={() => startEditing(z)} disabled={mode !== 'view'} style={{ flex: 1, padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--accent-cyan)', backgroundColor: 'transparent', color: 'var(--accent-cyan)', cursor: mode === 'view' ? 'pointer' : 'not-allowed', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
                  <Edit2 size={14} /> Editar
                </button>
                <button onClick={() => deleteZona(z.id)} disabled={mode !== 'view'} style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '4px', border: '1px solid #e74c3c', backgroundColor: 'transparent', color: '#e74c3c', cursor: mode === 'view' ? 'pointer' : 'not-allowed' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mapa */}
      <div style={{ flex: 1, borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
        <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <DrawInteraction isDrawing={mode === 'draw'} currentPolygon={currentPolygon} setCurrentPolygon={setCurrentPolygon} />

          {/* Zonas Guardadas (Excluyendo la que se está editando) */}
          {zonas.filter(z => mode !== 'edit' || editingZone?.id !== z.id).map(z => (
            <Polygon 
              key={z.id}
              positions={z.coordenadas.map(c => [c.lat, c.lng])}
              pathOptions={{ 
                color: z.color, 
                fillColor: z.color, 
                fillOpacity: z.activa ? 0.2 : 0.05,
                weight: z.activa ? 2 : 1,
                dashArray: z.activa ? null : '5, 5'
              }}
            />
          ))}

          {/* Polígono en Dibujo */}
          {mode === 'draw' && currentPolygon.length > 0 && (
            <>
              {currentPolygon.length > 2 && (
                <Polygon 
                  positions={currentPolygon.map(c => [c.lat, c.lng])}
                  pathOptions={{ color: '#1ca9c9', fillColor: '#1ca9c9', fillOpacity: 0.3, weight: 2 }}
                />
              )}
              {currentPolygon.length <= 2 && (
                <Polyline 
                  positions={currentPolygon.map(c => [c.lat, c.lng])}
                  pathOptions={{ color: '#1ca9c9', weight: 2, dashArray: '5, 5' }}
                />
              )}
              {currentPolygon.map((p, i) => (
                <Marker key={i} position={[p.lat, p.lng]} icon={vertexIcon} />
              ))}
            </>
          )}

          {/* Polígono en Edición */}
          {mode === 'edit' && editingZone && (
            <>
              <Polygon 
                positions={editingZone.coordenadas.map(c => [c.lat, c.lng])}
                pathOptions={{ color: '#f1c40f', fillColor: '#f1c40f', fillOpacity: 0.3, weight: 2 }}
              />
              {editingZone.coordenadas.map((p, i) => (
                <Marker 
                  key={i} 
                  position={[p.lat, p.lng]} 
                  icon={vertexIcon} 
                  draggable={true}
                  eventHandlers={{
                    dragend: (e) => handleVertexDrag(i, e)
                  }}
                />
              ))}
            </>
          )}

        </MapContainer>
        
        {/* Helper visual encima del mapa */}
        {mode === 'draw' && (
          <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', backgroundColor: '#0f172a', padding: '10px 20px', borderRadius: '20px', color: 'white', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <Info size={16} color="var(--accent-cyan)" /> 
            Haz clic en el mapa para marcar los vértices de la geocerca.
          </div>
        )}
      </div>
    </div>
  );
}

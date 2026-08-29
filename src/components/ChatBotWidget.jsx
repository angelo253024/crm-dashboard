import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, X, Send, Trash2, Loader2, Sparkles, Database, Bot, MapPin } from 'lucide-react';
import { HybridAIService } from '../services/chatbot/HybridAIService';
import { geofencingService } from '../services/geofencing/GeofencingService';
import { MapContainer, TileLayer, Marker, Polygon, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet icon not showing in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function ChatBotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: '¡Hola! 👋✨ Soy tu asesor virtual de **Lavamóvil Norte**.\n\nVamos hasta tu domicilio u oficina con todo nuestro equipamiento profesional. Solo necesitamos una toma de agua y un enchufe disponible. ¿En qué podemos consentir a tu vehículo hoy?', sender: 'bot', source: null }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapPosition, setMapPosition] = useState({ lat: -17.783, lng: -63.180 });
  const [zonasCobertura, setZonasCobertura] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadZonas = async () => {
      try {
        const zonas = await geofencingService.getZonas(true);
        setZonasCobertura(zonas);
      } catch (err) {
        console.error('Error fetching zonas for chatbot map:', err);
      }
    };
    loadZonas();
  }, []);

  // Helper para arreglar el renderizado gris del mapa
  const RecenterMap = () => {
    const map = useMap();
    useEffect(() => {
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 300);
      return () => clearTimeout(timer);
    }, [map]);
    return null;
  };

  // Helper para actualizar la posición en el mapa
  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        setMapPosition(e.latlng);
      },
    });
    return null;
  };
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const quickReplies = [
    { label: '✨ Paquetes y Precios', intent: 'precios' },
    { label: '📅 Reservar Cita', intent: 'reservar' },
    { label: '💧 ¿Cómo funciona?', intent: 'requisitos' },
    { label: '🧼 Tapicería y Asientos', intent: 'tapiceria' },
    { label: '⚙️ Lavado de Motor', intent: 'motor' },
    { label: '🚙 Zonas de Cobertura', intent: 'cobertura' },
    { label: '💳 Métodos de Pago', intent: 'metodos_pago' },
    { label: '⭐ Promociones Activas', intent: 'promociones' },
    { label: '🕒 Horarios de Atención', intent: 'horario' },
    { label: '📞 Hablar con un Asesor', intent: 'contacto' }
  ];

  const sendMessageToService = async (textToSend) => {
    setIsTyping(true);
    try {
      const response = await HybridAIService.processMessage(
        textToSend, 
        'web-session-123',
        (status) => setStatusMessage(status)
      );

      if (response.reservaExtra) {
        // Guardar la reserva activa en localStorage para que ServiciosCatalog y el cliente la reconozcan
        const savedData = {
          id: response.reservaExtra.reservaId,
          chat_session_id: response.reservaExtra.chatSessionId,
          estado_reserva: 'pendiente',
          estado: 'Reservado'
        };
        
        // Compatible con la nueva lógica de múltiples reservas
        try {
          const existingStr = localStorage.getItem('active_reservas_list_v2');
          let reservasArray = existingStr ? JSON.parse(existingStr) : [];
          reservasArray = [savedData, ...reservasArray];
          localStorage.setItem('active_reservas_list_v2', JSON.stringify(reservasArray));
        } catch(e) {
          localStorage.setItem('active_reservas_list_v2', JSON.stringify([savedData]));
        }
      }

      setMessages(prev => [...prev, { 
        id: Date.now(), 
        text: response.text, 
        sender: 'bot',
        source: response.source,
        buttons: response.buttons || null,
        requestGPS: response.requestGPS || false,
        reservaExtra: response.reservaExtra || null
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        text: "Hubo un error de conexión, intenta de nuevo.", 
        sender: 'bot',
        source: 'error'
      }]);
    } finally {
      setIsTyping(false);
      setStatusMessage('');
    }
  };

  const handleQuickReply = async (reply) => {
    setMessages(prev => [...prev, { id: Date.now(), text: reply.label, sender: 'user', source: null }]);
    await sendMessageToService(reply.intent);
  };

  const handleButtonClick = async (btn) => {
    if (btn.isLink) {
      window.open(btn.url, '_blank');
      return;
    }
    setMessages(prev => [...prev, { id: Date.now(), text: btn.label, sender: 'user', source: null }]);
    await sendMessageToService(btn.value || btn.label);
  };

  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }
    
    setStatusMessage("Obteniendo ubicación GPS...");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const gpsStr = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setMessages(prev => [...prev, { id: Date.now(), text: `📍 Mi ubicación: ${gpsStr}`, sender: 'user', source: null }]);
        await sendMessageToService(gpsStr);
      },
      (error) => {
        console.error("Error obteniendo GPS:", error);
        alert("No se pudo obtener la ubicación GPS automáticamente. Por favor escribe tu dirección.");
        setStatusMessage("");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Función para renderizar el texto del bot (negritas y botón de reservar)
  const renderMessageText = (msg) => {
    const text = msg.text;
    if (!text) return null;
    
    const hasReserva = text.includes('**[RESERVAR_CITA]**');
    const cleanText = text.replace('**[RESERVAR_CITA]**', '').trim();
    const parts = cleanText.split(/(\*\*.*?\*\*)/g);
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ whiteSpace: 'pre-wrap' }}>
          {parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={i}>{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </span>
        
        {hasReserva && (
          <button 
            onClick={() => handleQuickReply({ label: '📅 Reservar cita', intent: 'reservar' })}
            style={{
              backgroundColor: 'var(--accent-green)',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginTop: '8px',
              alignSelf: 'flex-start'
            }}
          >
            📅 Reservar Cita Ahora
          </button>
        )}

        {/* Botón de GPS si la respuesta lo solicita */}
        {msg.requestGPS && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', alignSelf: 'flex-start' }}>
            <button
              onClick={handleGetGPS}
              disabled={isTyping}
              style={{
                backgroundColor: '#10b981',
                color: '#fff',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              📍 Usar mi ubicación GPS actual
            </button>
            <button
              onClick={() => setShowMapModal(true)}
              disabled={isTyping}
              style={{
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
            >
              🗺️ Elegir en el mapa
            </button>
          </div>
        )}

        {/* Botones Interactivos (Servicios, Fechas, Confirmación) */}
        {msg.buttons && msg.buttons.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
            {msg.buttons.map((btn, idx) => (
              btn.isSeparator ? (
                <div 
                  key={idx} 
                  style={{ 
                    marginTop: '8px', 
                    marginBottom: '2px', 
                    fontSize: '12px', 
                    fontWeight: 'bold', 
                    color: 'var(--text-muted)', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.5px' 
                  }}
                >
                  {btn.label}
                </div>
              ) : (
                <button
                  key={idx}
                  onClick={() => handleButtonClick(btn)}
                  disabled={isTyping}
                  style={{
                    backgroundColor: 'var(--bg-color)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '600',
                    textAlign: 'left',
                    cursor: isTyping ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => !isTyping && (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
                  onMouseLeave={e => !isTyping && (e.currentTarget.style.borderColor = 'var(--border-color)')}
                >
                  {btn.label}
                </button>
              )
            ))}
          </div>
        )}

        {/* Ir al catálogo o Ver Citas si finalizó */}
        {msg.reservaExtra && (
          <button
            onClick={() => {
              setIsOpen(false);
              navigate('/reservar');
            }}
            style={{
              backgroundColor: 'var(--accent-blue)',
              color: '#fff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '10px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginTop: '8px',
              alignSelf: 'flex-start'
            }}
          >
            💬 Abrir Chat con Trabajador
          </button>
        )}
      </div>
    );
  };

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, statusMessage]);

  // Listen for global open events
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('openChatBot', handleOpen);
    return () => window.removeEventListener('openChatBot', handleOpen);
  }, []);

  // Auto-focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current && window.innerWidth > 768) {
      setTimeout(() => inputRef.current.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { id: Date.now(), text: userMsg, sender: 'user', source: null }]);
    await sendMessageToService(userMsg);
  };

  const handleClear = () => {
    if (window.confirm("¿Seguro que deseas limpiar la conversación?")) {
      setMessages([
        { id: 1, text: '¡Hola! Soy tu asistente inteligente. ¿En qué te puedo ayudar hoy?', sender: 'bot', source: null }
      ]);
    }
  };

  const getSourceIcon = (source) => {
    if (source === 'openai') return <Sparkles size={12} color="#8b5cf6" title="Respuesta generada por OpenAI" />;
    if (source === 'supabase' || source === 'cache') return <Database size={12} color="#10b981" title="Respuesta desde Base de Datos/Caché" />;
    return null;
  };

  return (
    <>
      {/* Botón Flotante */}
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: 'var(--accent-blue)',
          color: 'white',
          width: '60px',
          height: '60px',
          borderRadius: '30px',
          display: isOpen ? 'none' : 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 10px 25px rgba(28, 169, 201, 0.4)',
          border: 'none',
          cursor: 'pointer',
          zIndex: 9998,
          transition: 'transform 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <MessageSquare size={28} />
      </button>

      {/* Panel Lateral del Chat */}
      <div style={{
        position: 'fixed',
        top: 0,
        bottom: 0,
        right: isOpen ? 0 : '-100%',
        width: '100%',
        maxWidth: '400px',
        height: '100dvh',
        maxHeight: '-webkit-fill-available',
        backgroundColor: 'var(--bg-color)',
        boxShadow: '-5px 0 25px rgba(0,0,0,0.5)',
        transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid var(--border-color)',
      }}>
        {/* Header */}
        <div style={{ 
          padding: '20px', 
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--card-bg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '12px', 
              backgroundColor: 'rgba(28, 169, 201, 0.1)', 
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              color: 'var(--accent-blue)'
            }}>
              <Bot size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-main)', fontWeight: '600' }}>Asistente Híbrido</h3>
              <div style={{ fontSize: '12px', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-green)' }} />
                En línea
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleClear} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }} title="Limpiar chat">
              <Trash2 size={20} />
            </button>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }} title="Cerrar">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Mensajes */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          backgroundColor: 'var(--bg-color)',
          minHeight: 0, // Fix for Safari flexbox overflow
          WebkitOverflowScrolling: 'touch'
        }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ 
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              position: 'relative'
            }}>
              <div style={{
                backgroundColor: msg.sender === 'user' ? 'var(--accent-blue)' : 'var(--card-bg)',
                color: msg.sender === 'user' ? '#fff' : 'var(--text-main)',
                padding: '12px 16px',
                borderRadius: '16px',
                borderBottomRightRadius: msg.sender === 'user' ? '4px' : '16px',
                borderBottomLeftRadius: msg.sender === 'bot' ? '4px' : '16px',
                border: msg.sender === 'bot' ? '1px solid var(--border-color)' : 'none',
                boxShadow: 'var(--shadow-sm)',
                fontSize: '14px',
                lineHeight: '1.5'
              }}>
                {msg.sender === 'bot' ? renderMessageText(msg) : msg.text}
              </div>
              
              {/* Indicador de Origen (IA vs BDD) */}
              {msg.sender === 'bot' && msg.source && (
                <div style={{ position: 'absolute', bottom: '-18px', left: '4px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {getSourceIcon(msg.source)}
                  <span style={{ textTransform: 'capitalize' }}>
                    {msg.source === 'gemini' ? 'Gemini IA' : 
                     msg.source === 'openai' ? 'OpenAI' : 
                     msg.source === 'cache' ? 'Caché IA' : 
                     msg.source === 'reservation' || msg.source === 'reservation-done' ? '📅 Cita Guiada' :
                     msg.source === 'error-gemini' ? '⚠️ Gemini no disponible' : 
                     msg.source === 'supabase' ? 'Base de Datos' : 'Regla Local'}
                  </span>
                </div>
              )}
            </div>
          ))}
          
          {isTyping && (
            <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
              <div style={{
                backgroundColor: 'var(--card-bg)',
                padding: '12px 16px',
                borderRadius: '16px',
                borderBottomLeftRadius: '4px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                gap: '4px'
              }}>
                <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
              <span style={{ fontSize: '12px', fontStyle: 'italic' }}>{statusMessage}</span>
            </div>
          )}
          
          <div ref={messagesEndRef} style={{ height: '20px' }} />
        </div>

        {/* Contenedor de Consultas Rápidas */}
        <div style={{
          padding: '12px 16px 8px 16px',
          backgroundColor: 'var(--card-bg)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none' // IE/Edge
        }}>
          <style>{`
            .quick-replies::-webkit-scrollbar { display: none; }
          `}</style>
          <div className="quick-replies" style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
            {quickReplies.map((reply, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickReply(reply)}
                disabled={isTyping}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'var(--bg-color)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '16px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: isTyping ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                  transition: 'background-color 0.2s',
                  opacity: isTyping ? 0.6 : 1
                }}
                onMouseEnter={e => !isTyping && (e.currentTarget.style.backgroundColor = 'rgba(28, 169, 201, 0.1)')}
                onMouseLeave={e => !isTyping && (e.currentTarget.style.backgroundColor = 'var(--bg-color)')}
              >
                {reply.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div style={{ 
          padding: '8px 16px 16px 16px', 
          backgroundColor: 'var(--card-bg)'
        }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px' }}>
            <input 
              ref={inputRef}
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Escribe tu mensaje..."
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '24px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-color)',
                color: 'var(--text-main)',
                outline: 'none',
                fontSize: '14px'
              }}
              disabled={isTyping}
            />
            <button 
              type="submit" 
              disabled={isTyping || !inputText.trim()}
              style={{
                backgroundColor: inputText.trim() && !isTyping ? 'var(--accent-blue)' : 'var(--border-color)',
                color: '#fff',
                border: 'none',
                width: '44px',
                height: '44px',
                borderRadius: '22px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: inputText.trim() && !isTyping ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s'
              }}
            >
              <Send size={18} style={{ marginLeft: '2px' }} />
            </button>
          </form>
        </div>
      </div>

      {/* Overlay para cerrar haciendo clic fuera (opcional en móvil) */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.3)',
            zIndex: 9998,
            display: window.innerWidth < 768 ? 'block' : 'none'
          }}
        />
      )}

      {/* Modal del Mapa Interactivo */}
      {showMapModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: '16px', width: '100%', maxWidth: '600px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                <MapPin size={20} color="var(--accent-blue)" />
                Mueve el pin a tu ubicación
              </h3>
              <button onClick={() => setShowMapModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ height: '350px', width: '100%' }}>
              <MapContainer center={[mapPosition.lat, mapPosition.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                {zonasCobertura.map(zona => {
                  if (!zona.coordenadas || !Array.isArray(zona.coordenadas) || zona.coordenadas.length === 0) return null;
                  const positions = zona.coordenadas.map(c => [c.lat, c.lng]);
                  return (
                    <Polygon 
                      key={zona.id} 
                      positions={positions} 
                      pathOptions={{ 
                        color: zona.color || '#1ca9c9', 
                        fillColor: zona.color || '#1ca9c9', 
                        fillOpacity: 0.2, 
                        weight: 2 
                      }} 
                    />
                  );
                })}
                <RecenterMap />
                <MapClickHandler />
                <Marker position={[mapPosition.lat, mapPosition.lng]} />
              </MapContainer>
            </div>
            <div style={{ padding: '16px', backgroundColor: 'var(--bg-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowMapModal(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 'bold' }}>
                Cancelar
              </button>
              <button onClick={async () => {
                setShowMapModal(false);
                const gpsStr = `${mapPosition.lat.toFixed(6)}, ${mapPosition.lng.toFixed(6)}`;
                setMessages(prev => [...prev, { id: Date.now(), text: `📍 Mi ubicación seleccionada en mapa: ${gpsStr}`, sender: 'user', source: null }]);
                await sendMessageToService(gpsStr);
              }} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'var(--accent-blue)', color: 'white', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} /> Confirmar Ubicación
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

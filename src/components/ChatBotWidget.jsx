import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, X, Send, Trash2, Loader2, Sparkles, Database, Bot } from 'lucide-react';
import { HybridAIService } from '../services/chatbot/HybridAIService';

export default function ChatBotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: '¡Hola! Soy tu asistente inteligente. ¿En qué te puedo ayudar hoy?', sender: 'bot', source: null }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const navigate = useNavigate();
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const quickReplies = [
    { label: '💲 Ver precios', intent: 'precios' },
    { label: '🚗 Ver servicios', intent: 'servicios' },
    { label: '📅 Reservar cita', intent: 'reservar' },
    { label: '📍 Ubicación', intent: 'ubicacion' },
    { label: '🕒 Horarios', intent: 'horario' },
    { label: '📞 Contacto', intent: 'contacto' },
    { label: '🚙 Cobertura', intent: 'cobertura' },
    { label: '💳 Métodos de pago', intent: 'metodos_pago' },
    { label: '⭐ Promociones', intent: 'promociones' },
    { label: '❓ Preguntas frecuentes', intent: 'cuanto demora' }
  ];

  const handleQuickReply = async (reply) => {
    setIsTyping(true);
    try {
      const response = await HybridAIService.processMessage(
        reply.intent, 
        'web-session-123',
        (status) => setStatusMessage(status)
      );

      let responseText = response.text;
      
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        text: responseText, 
        sender: 'bot',
        source: response.source
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

  // Función para renderizar el texto del bot (negritas y botón de reservar)
  const renderMessageText = (text) => {
    if (!text) return null;
    
    // Si contiene el tag de reservar, mostramos el botón y navegamos
    const hasReserva = text.includes('**[RESERVAR_CITA]**');
    const cleanText = text.replace('**[RESERVAR_CITA]**', '').trim();
    
    // Simple markdown for bold (**)
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
            onClick={() => {
              setIsOpen(false);
              navigate('/'); // Asumiendo que la reserva está en la página principal o modal
            }}
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
            Ir a Reservar
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
    setIsTyping(true);

    try {
      const response = await HybridAIService.processMessage(
        userMsg, 
        'web-session-123', // Hardcoded session for web demo
        (status) => setStatusMessage(status)
      );

      setMessages(prev => [...prev, { 
        id: Date.now(), 
        text: response.text, 
        sender: 'bot',
        source: response.source // 'openai', 'supabase', 'cache'
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
                {msg.sender === 'bot' ? renderMessageText(msg.text) : msg.text}
              </div>
              
              {/* Indicador de Origen (IA vs BDD) */}
              {msg.sender === 'bot' && msg.source && (
                <div style={{ position: 'absolute', bottom: '-18px', left: '4px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {getSourceIcon(msg.source)}
                  <span style={{ textTransform: 'capitalize' }}>{msg.source === 'gemini' ? 'Gemini IA' : msg.source === 'openai' ? 'OpenAI' : msg.source === 'cache' ? 'Caché IA' : msg.source === 'error-gemini' ? '⚠️ Gemini no disponible' : msg.source === 'supabase' ? 'Base de Datos' : 'Regla Local'}</span>
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
    </>
  );
}

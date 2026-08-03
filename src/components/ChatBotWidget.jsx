import React, { useState, useEffect, useRef } from 'react';
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
  
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, statusMessage]);

  // Escuchar el evento de apertura externa (ej. desde Login)
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-chatbot', handleOpen);
    return () => window.removeEventListener('open-chatbot', handleOpen);
  }, []);

  // Listen for global open events
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('openChatBot', handleOpen);
    return () => window.removeEventListener('openChatBot', handleOpen);
  }, []);

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
        right: isOpen ? 0 : '-400px',
        width: '400px',
        height: '100vh',
        backgroundColor: 'var(--bg-color)',
        boxShadow: '-5px 0 25px rgba(0,0,0,0.5)',
        transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid var(--border-color)',
        maxWidth: '100vw'
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
          backgroundColor: 'var(--bg-color)'
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
                {msg.text}
              </div>
              
              {/* Indicador de Origen (IA vs BDD) */}
              {msg.sender === 'bot' && msg.source && (
                <div style={{ position: 'absolute', bottom: '-18px', left: '4px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {getSourceIcon(msg.source)}
                  <span style={{ textTransform: 'capitalize' }}>{msg.source === 'openai' ? 'OpenAI' : msg.source === 'cache' ? 'Caché IA' : 'Regla Local'}</span>
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

        {/* Input */}
        <div style={{ 
          padding: '16px', 
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--card-bg)'
        }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px' }}>
            <input 
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

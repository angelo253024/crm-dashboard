import React from 'react';
import { Search, Bell, Sun, Moon, Plus, MessageSquare, MapPin, ChevronDown } from 'lucide-react';

export default function Header({ isDarkMode, toggleTheme, user }) {
  // Función para obtener la inicial del nombre
  const getInitial = (name) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  const userName = user?.nombre || 'Usuario';
  const userRole = user?.rol || 'Administrador';
  const userId = user?.id ? user.id.substring(0, 8) : 'Invitado';
  const userPhoto = user?.foto_url;

  return (
    <header className="header">
      <div className="search-bar">
        <Search size={18} className="text-muted" />
        <input type="text" placeholder="Buscar clientes, servicios o placas..." />
      </div>

      <div className="header-actions">
        {/* Nuevos botones rápidos */}
        <button className="btn-secondary" style={{ display: 'none', alignItems: 'center', gap: '8px', padding: '8px 12px', fontSize: '13px' }}>
          <MapPin size={16} /> Notificar Llegada
        </button>
        <button className="btn-outline-cyan" style={{ borderRadius: '30px', padding: '8px 16px', fontSize: '14px' }}>
          <MessageSquare size={16} /> Chatbot
        </button>
        <button className="btn-primary" style={{ borderRadius: '30px', padding: '8px 20px', fontSize: '14px', backgroundColor: '#3b82f6', color: 'white' }}>
          <Plus size={16} /> Nuevo Servicio
        </button>

        {/* Notificaciones y Tema */}
        <button className="icon-btn">
          <Bell size={20} />
        </button>
        
        <button className="icon-btn" onClick={toggleTheme}>
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="user-profile">
          {userPhoto ? (
            <img src={userPhoto} alt="User" className="avatar" />
          ) : (
            <div className="avatar" style={{ 
              backgroundColor: 'var(--accent-cyan)', 
              color: 'var(--bg-color)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '16px'
            }}>
              {getInitial(userName)}
            </div>
          )}
          
          <div>
            <div className="text-small font-semibold">{userName}</div>
            <div className="text-small text-muted">{userRole} - ID: {userId}</div>
          </div>
          <ChevronDown size={16} className="text-muted" />
        </div>
      </div>
    </header>
  );
}

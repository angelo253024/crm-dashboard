import React from 'react';
import { Search, Bell, Sun, Moon, Plus, MessageSquare, MapPin, ChevronDown } from 'lucide-react';

export default function Header({ isDarkMode, toggleTheme }) {
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
          <img src="https://i.pravatar.cc/150?u=u2" alt="User" className="avatar" />
          <div>
            <div className="text-small font-semibold">Angelo Israel Miranda Vivero</div>
            <div className="text-small text-muted">ID: 4827682</div>
          </div>
          <ChevronDown size={16} className="text-muted" />
        </div>
      </div>
    </header>
  );
}

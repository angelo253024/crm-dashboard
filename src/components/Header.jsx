import React, { useState } from 'react';
import { Search, Bell, Sun, Moon, Plus, MessageSquare, MapPin, ChevronDown, User, LogOut, Settings, X } from 'lucide-react';
import { supabase } from '../supabase';

export default function Header({ isDarkMode, toggleTheme, user, setUser }) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Estados del modal de edición
  const [formData, setFormData] = useState({
    nombre: user?.nombre || '',
    password: user?.password || '',
    foto_url: user?.foto_url || ''
  });

  const getInitial = (name) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  const userName = user?.nombre || 'Usuario';
  const userRole = user?.rol || 'Administrador';
  const userId = user?.id ? user.id.substring(0, 8) : 'Invitado';
  const userPhoto = user?.foto_url;

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from('trabajadores')
      .update({
        nombre: formData.nombre,
        password: formData.password,
        foto_url: formData.foto_url
      })
      .eq('id', user.id)
      .select();
      
    if (error) {
      alert('Error al actualizar el perfil.');
      console.error(error);
    } else {
      // Actualizamos el estado global del usuario para que cambie en la interfaz inmediatamente
      setUser(data[0]);
      setIsEditModalOpen(false);
      setIsProfileMenuOpen(false);
    }
  };

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

        <div style={{ position: 'relative' }}>
          <div 
            className="user-profile" 
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            style={{ cursor: 'pointer' }}
          >
            {userPhoto ? (
              <img src={userPhoto} alt="User" className="avatar" style={{ objectFit: 'cover' }} />
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
            <ChevronDown 
              size={16} 
              className="text-muted" 
              style={{ 
                transform: isProfileMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease'
              }} 
            />
          </div>

          {/* Menú Desplegable del Perfil */}
          {isProfileMenuOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              backgroundColor: 'var(--card-bg)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-card)',
              border: '1px solid var(--border-color)',
              zIndex: 100,
              minWidth: '200px',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <div style={{ padding: '8px' }}>
                <button 
                  className="dropdown-item" 
                  onClick={() => {
                    setFormData({
                      nombre: user?.nombre || '',
                      password: user?.password || '',
                      foto_url: user?.foto_url || ''
                    });
                    setIsEditModalOpen(true);
                  }}
                >
                  <User size={14} /> Editar Mi Perfil
                </button>
              </div>
              <div style={{ padding: '8px', borderTop: '1px solid var(--border-color)' }}>
                <button className="dropdown-item text-red" onClick={() => window.location.reload()}>
                  <LogOut size={14} /> Cerrar Sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal para Editar Perfil */}
      {isEditModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--card-bg)', padding: '24px', borderRadius: 'var(--radius-lg)', width: '400px', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <h2 className="text-h2">Editar Mi Perfil</h2>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Nombre Completo</label>
                <input 
                  type="text" 
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Contraseña</label>
                <input 
                  type="text" 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>URL de Foto de Perfil (Opcional)</label>
                <input 
                  type="url" 
                  value={formData.foto_url}
                  onChange={(e) => setFormData({...formData, foto_url: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                  placeholder="https://ejemplo.com/mifoto.jpg"
                />
              </div>
              
              <button type="submit" className="btn-primary" style={{ marginTop: '16px', justifyContent: 'center' }}>
                Guardar Cambios
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Sun, Moon, Plus, MessageSquare, MapPin, ChevronDown, User, LogOut, Settings, X, Check, Users } from 'lucide-react';
import { supabase } from '../supabase';

export default function Header({ isDarkMode, toggleTheme, user, setUser, onLogout }) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Notificaciones State
  const [notificaciones, setNotificaciones] = useState([]);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);

  // Trabajadores State
  const [trabajadores, setTrabajadores] = useState([]);
  const [isWorkersMenuOpen, setIsWorkersMenuOpen] = useState(false);

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

  const navigate = useNavigate();

  useEffect(() => {
    fetchNotificaciones();
    fetchTrabajadores();
    
    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('notificaciones-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones' },
        (payload) => {
          // Check if it's from today before adding
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const notifDate = new Date(payload.new.fecha);
          if (notifDate >= today) {
            setNotificaciones(prev => [payload.new, ...prev]);
          }
        }
      )
      .subscribe();

    const channelTrabajadores = supabase
      .channel('trabajadores-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trabajadores' },
        (payload) => {
          fetchTrabajadores();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(channelTrabajadores);
    };
  }, []);

  const fetchTrabajadores = async () => {
    const { data } = await supabase
      .from('trabajadores')
      .select('*')
      .order('nombre', { ascending: true });
      
    if (data) setTrabajadores(data);
  };

  const fetchNotificaciones = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('notificaciones')
      .select('*')
      .gte('fecha', today.toISOString())
      .order('fecha', { ascending: false });
      
    if (data) setNotificaciones(data);
  };

  const markAllAsRead = async () => {
    const unreadIds = notificaciones.filter(n => !n.leida).map(n => n.id);
    if (unreadIds.length > 0) {
      await supabase.from('notificaciones').update({ leida: true }).in('id', unreadIds);
      setNotificaciones(notificaciones.map(n => ({ ...n, leida: true })));
    }
  };

  const unreadCount = notificaciones.filter(n => !n.leida).length;

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (user.id === 'local-demo') {
      alert('Estás usando el usuario de demostración (local-demo). Para editar tu perfil real, ve a la sección "Trabajadores" y asegúrate de que exista tu usuario allí, luego cierra sesión y entra con él.');
      return;
    }

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
      setUser(data[0]);
      setIsEditModalOpen(false);
      setIsProfileMenuOpen(false);
    }
  };

  const getNotifColor = (tipo) => {
    switch (tipo) {
      case 'success': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return 'var(--text-main)';
    }
  };

  const handleNuevoServicioClick = () => {
    if (window.location.pathname === '/servicios') {
      window.dispatchEvent(new CustomEvent('openNewServiceModal'));
    } else {
      navigate('/servicios', { state: { openNewModal: true } });
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
        <button 
          className="btn-outline-cyan" 
          onClick={() => window.dispatchEvent(new CustomEvent('openChatBot'))}
          style={{ borderRadius: '30px', padding: '8px 16px', fontSize: '14px' }}
        >
          <MessageSquare size={16} /> Chatbot
        </button>
        <button onClick={handleNuevoServicioClick} className="btn-primary" style={{ borderRadius: '30px', padding: '8px 20px', fontSize: '14px', backgroundColor: '#3b82f6', color: 'white' }}>
          <Plus size={16} /> Nuevo Servicio
        </button>

        {/* Trabajadores Status Button */}
        <div style={{ position: 'relative' }}>
          <button 
            className="btn-secondary" 
            onClick={() => setIsWorkersMenuOpen(!isWorkersMenuOpen)}
            style={{ borderRadius: '30px', padding: '8px 16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
          >
            <Users size={16} className="text-muted" /> Trabajadores
          </button>

          {isWorkersMenuOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '12px',
              backgroundColor: 'var(--card-bg)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              border: '1px solid var(--border-color)',
              zIndex: 100,
              width: '280px',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>Estado del Personal</h3>
              </div>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {trabajadores.filter(t => t.estado && t.estado !== 'Inactivo').length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No hay personal activo
                  </div>
                ) : (
                  trabajadores.filter(t => t.estado && t.estado !== 'Inactivo').map(t => (
                    <div key={t.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {t.foto_url ? (
                          <img src={t.foto_url} alt={t.nombre} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--accent-cyan)', color: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
                            {getInitial(t.nombre)}
                          </div>
                        )}
                        <span style={{ fontSize: '13px', fontWeight: '500' }}>{t.nombre}</span>
                      </div>
                      <span style={{ 
                        fontSize: '11px', 
                        fontWeight: '600',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor: t.estado === 'Ocupado' ? 'rgba(239, 68, 68, 0.1)' : t.estado === 'Inactivo' ? 'rgba(156, 163, 175, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: t.estado === 'Ocupado' ? '#ef4444' : t.estado === 'Inactivo' ? '#9ca3af' : '#10b981'
                      }}>
                        {t.estado === 'Ocupado' ? 'Ocupado' : t.estado === 'Inactivo' ? 'Inactivo' : (t.estado || 'Inactivo')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Notificaciones */}
        <div style={{ position: 'relative' }}>
          <button className="icon-btn" onClick={() => setIsNotifMenuOpen(!isNotifMenuOpen)} style={{ position: 'relative' }}>
            <Bell size={20} />
            {unreadCount > 0 && (
              <div style={{ position: 'absolute', top: 4, right: 6, width: 8, height: 8, backgroundColor: '#ef4444', borderRadius: '50%', border: '2px solid var(--bg-color)' }}></div>
            )}
          </button>

          {isNotifMenuOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '12px',
              backgroundColor: 'var(--card-bg)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              border: '1px solid var(--border-color)',
              zIndex: 100,
              width: '320px',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>Notificaciones</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={14} /> Marcar como leídas
                  </button>
                )}
              </div>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {notificaciones.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Sin notificaciones por hoy
                  </div>
                ) : (
                  notificaciones.map(notif => (
                    <div key={notif.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', backgroundColor: notif.leida ? 'transparent' : 'rgba(28, 169, 201, 0.05)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getNotifColor(notif.tipo), marginTop: '6px', flexShrink: 0, opacity: notif.leida ? 0.3 : 1 }}></div>
                      <div>
                        <div style={{ fontSize: '13px', color: 'var(--text-main)', marginBottom: '4px', lineHeight: '1.4' }}>{notif.mensaje}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(notif.fecha).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Tema */}
        <button className="icon-btn" onClick={toggleTheme}>
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Perfil */}
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
                <button className="dropdown-item text-red" onClick={() => onLogout()}>
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

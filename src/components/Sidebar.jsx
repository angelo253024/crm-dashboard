import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, CalendarClock, Map, Users, CarFront, Package, ChevronDown, Lock, Settings, CreditCard, LogOut, LifeBuoy, Tag, Bot, Clock } from 'lucide-react';

export default function Sidebar({ user }) {
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);

  return (
    <aside className="sidebar">
      {/* Logo LAVAMOVIL NORTE */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
        <img 
          src="/logo.png" 
          alt="Lavamóvil Norte" 
          style={{ height: '60px', width: 'auto', objectFit: 'contain', cursor: 'pointer' }}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div style={{ display: 'none', flexDirection: 'column', lineHeight: '1.1' }}>
          <div style={{ display: 'flex', alignItems: 'center', fontWeight: 900, fontSize: '24px' }}>
            <span style={{ color: 'var(--accent-dark)' }}>LAVA</span>
            <span style={{ color: 'var(--accent-green)', margin: '0 2px' }}>M</span>
            <span style={{ color: 'var(--accent-dark)' }}>ÓVIL</span>
          </div>
          <div style={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: '13px', letterSpacing: '4px' }}>
            NORTE
          </div>
        </div>
      </div>
      
      <div style={{ position: 'relative' }}>
        <div 
          className="sidebar-workspace" 
          onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
          style={{ 
            cursor: 'pointer', 
            transition: 'all 0.2s ease', 
            backgroundColor: isWorkspaceOpen ? 'var(--card-bg)' : 'transparent',
            boxShadow: isWorkspaceOpen ? 'var(--shadow-sm)' : 'none'
          }}
        >
          <div className="workspace-icon">
            <Lock size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="text-small font-semibold">Mi Espacio</div>
            <div className="text-small text-muted" style={{ fontWeight: 400 }}>Plan Admin</div>
          </div>
          <ChevronDown 
            size={16} 
            className="text-muted" 
            style={{ 
              transform: isWorkspaceOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease'
            }} 
          />
        </div>

        {isWorkspaceOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '8px',
            backgroundColor: 'var(--card-bg)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-card)',
            border: '1px solid var(--border-color)',
            zIndex: 100,
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px' }}>CUENTA ACTUAL</div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>{user?.nombre || 'Usuario'}</div>
            </div>
            <div style={{ padding: '8px' }}>
              <a 
                href="https://wa.me/59168754870?text=Hola,%20necesito%20soporte%20con%20el%20sistema" 
                target="_blank" 
                rel="noreferrer"
                className="dropdown-item" 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}
              >
                <LifeBuoy size={14} /> Centro de Ayuda
              </a>
            </div>
            <div style={{ padding: '8px', borderTop: '1px solid var(--border-color)' }}>
              <button className="dropdown-item text-red" onClick={async () => {
                if (user && user.id !== 'local-demo') {
                  const { supabase } = await import('../supabase');
                  try {
                    // Update exit time if working
                    const { data: horarios } = await supabase
                      .from('trabajador_horarios')
                      .select('id')
                      .eq('trabajador_id', user.id)
                      .is('hora_salida', null)
                      .order('created_at', { ascending: false })
                      .limit(1);
              
                    if (horarios && horarios.length > 0) {
                      await supabase.from('trabajador_horarios').update({ hora_salida: new Date().toISOString() }).eq('id', horarios[0].id);
                    }
                    
                    // Set inactive
                    await supabase.from('trabajadores').update({ estado_disponibilidad: 'inactivo' }).eq('id', user.id);
                  } catch(e) {}
                }
                localStorage.removeItem('crm_user');
                window.location.href = '/login';
              }}>
                <LogOut size={14} /> Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Home size={20} />
          <span>Resumen</span>
        </NavLink>
        <NavLink to="/citas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <CalendarClock size={20} />
          <span>Citas / Agenda</span>
        </NavLink>
        <NavLink to="/horarios" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Clock size={20} />
          <span>Horarios</span>
        </NavLink>
        <NavLink to="/zonas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Map size={20} />
          <span>Mapa / Zonas</span>
        </NavLink>
        {(user?.rol === 'Administrador' || user?.rol === 'Admin') && (
          <>
            <NavLink to="/trabajadores" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Users size={20} />
              <span>Trabajadores</span>
            </NavLink>
            <NavLink to="/clientes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <CarFront size={20} />
              <span>Clientes</span>
            </NavLink>
            <NavLink to="/servicios" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Package size={20} />
              <span>Servicios</span>
            </NavLink>
            <NavLink to="/promos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Tag size={20} />
              <span>Promos</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* ADMIN-ONLY SECTION */}
      {(user?.rol === 'Administrador' || user?.rol === 'Admin') && (
        <div style={{ marginTop: '24px' }}>
          <div style={{ padding: '0 24px', marginBottom: '8px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
            Avanzado
          </div>
          <nav className="nav-menu">
            <NavLink to="/admin-bot" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Bot size={20} />
              <span>Admin Bot</span>
            </NavLink>
          </nav>
        </div>
      )}

    </aside>
  );
}

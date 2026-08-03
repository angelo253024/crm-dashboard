import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, CalendarClock, Map, Users, CarFront, Package, ChevronDown, Lock, Settings, CreditCard, LogOut, LifeBuoy } from 'lucide-react';

export default function Sidebar() {
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
              <div style={{ fontSize: '14px', fontWeight: '500' }}>Admin Lavamovil</div>
            </div>
            <div style={{ padding: '8px' }}>
              <button className="dropdown-item" onClick={() => alert('Configuración próximamente')}>
                <Settings size={14} /> Configuración de Cuenta
              </button>
              <button className="dropdown-item" onClick={() => alert('Facturación próximamente')}>
                <CreditCard size={14} /> Facturación y Planes
              </button>
              <button className="dropdown-item" onClick={() => alert('Soporte próximamente')}>
                <LifeBuoy size={14} /> Centro de Ayuda
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

      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Home size={20} />
          <span>Resumen</span>
        </NavLink>
        <NavLink to="/citas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <CalendarClock size={20} />
          <span>Citas / Agenda</span>
        </NavLink>
        <NavLink to="/zonas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Map size={20} />
          <span>Mapa / Zonas</span>
        </NavLink>
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
      </nav>

    </aside>
  );
}

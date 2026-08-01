import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, CalendarClock, Map, Users, CarFront, Package, ChevronDown, Lock } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      {/* Logo LAVAMOVIL NORTE */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.1', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', fontWeight: 900, fontSize: '24px' }}>
          <span style={{ color: 'var(--accent-dark)' }}>LAVA</span>
          <span style={{ color: 'var(--accent-green)', margin: '0 2px' }}>M</span>
          <span style={{ color: 'var(--accent-dark)' }}>ÓVIL</span>
        </div>
        <div style={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: '13px', letterSpacing: '4px' }}>
          NORTE
        </div>
      </div>
      
      <div className="sidebar-workspace">
        <div className="workspace-icon">
          <Lock size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="text-small font-semibold">Mi Espacio</div>
          <div className="text-small text-muted" style={{ fontWeight: 400 }}>Plan Admin</div>
        </div>
        <ChevronDown size={16} className="text-muted" />
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
        <NavLink to="/productos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Package size={20} />
          <span>Productos</span>
        </NavLink>
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img src="https://i.pravatar.cc/150?u=u2" alt="User" className="avatar" />
        <div>
          <div className="text-small font-semibold">Admin Lavamovil</div>
          <div className="text-small text-muted" style={{ fontSize: '11px' }}>admin@lavamovil.com</div>
        </div>
      </div>
    </aside>
  );
}

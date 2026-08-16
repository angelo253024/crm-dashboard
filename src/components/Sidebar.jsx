import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, CalendarClock, Map, Users, CarFront, Package, ChevronDown, Lock, Settings, CreditCard, LogOut, LifeBuoy, Tag, Bot, Wallet, Banknote, User, X, Clock } from 'lucide-react';
import { supabase } from '../supabase';
import WorkerStatsModal from './WorkerStatsModal';

export default function Sidebar({ user, onLogout, isOpen, onClose }) {
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const isTrabajador = user?.rol === 'Trabajador';

  const [trabajadores, setTrabajadores] = useState([]);
  const [isLiquidacionOpen, setIsLiquidacionOpen] = useState(false);
  const [isAnticiposOpen, setIsAnticiposOpen] = useState(false);
  const [selectedWorkerForStats, setSelectedWorkerForStats] = useState(null);

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  useEffect(() => {
    if (!isTrabajador) {
      fetchTrabajadores();
    }
  }, [isTrabajador]);

  const fetchTrabajadores = async () => {
    const { data: workers } = await supabase
      .from('trabajadores')
      .select('id, nombre, foto_url')
      .eq('rol', 'Trabajador')
      .order('nombre', { ascending: true });

    if (!workers) return;

    const { data: reservas } = await supabase
      .from('reservas')
      .select('trabajador_id, precio_total, precio, estado_reserva');

    const workersWithStats = workers.map(w => {
      const wReservas = (reservas || []).filter(r => 
        r.trabajador_id === w.id && 
        r.estado_reserva !== 'Cancelado'
      );
      const ventas = wReservas.length;
      const ganancias = wReservas.reduce((sum, r) => sum + (Number(r.precio_total) || Number(r.precio) || 0), 0);
      return { ...w, ventas, ganancias };
    });

    setTrabajadores(workersWithStats);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div 
        className={`sidebar-backdrop ${isOpen ? 'open' : ''}`} 
        onClick={onClose} 
        aria-label="Cerrar menú lateral"
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Header con Logo y botón de cierre para móvil */}
        <div className="sidebar-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', flex: 1 }}>
            <img 
              src="/logo.png" 
              alt="Lavamóvil Norte" 
              style={{ height: '55px', width: 'auto', objectFit: 'contain', cursor: 'pointer' }}
              onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div style={{ display: 'none', flexDirection: 'column', lineHeight: '1.1' }}>
              <div style={{ display: 'flex', alignItems: 'center', fontWeight: 900, fontSize: '22px' }}>
                <span style={{ color: 'var(--accent-dark)' }}>LAVA</span>
                <span style={{ color: 'var(--accent-green)', margin: '0 2px' }}>M</span>
                <span style={{ color: 'var(--accent-dark)' }}>ÓVIL</span>
              </div>
              <div style={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: '12px', letterSpacing: '4px' }}>
                NORTE
              </div>
            </div>
          </div>
          
          <button 
            className="sidebar-close-btn" 
            onClick={onClose} 
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
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
              <div className="text-small text-muted" style={{ fontWeight: 400 }}>{isTrabajador ? 'App Trabajador' : 'Plan Admin'}</div>
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
                <div style={{ fontSize: '14px', fontWeight: '500' }}>{isTrabajador ? user?.nombre : 'Admin Lavamovil'}</div>
              </div>
              <div style={{ padding: '8px' }}>
                <button className="dropdown-item" onClick={() => alert('Configuración próximamente')}>
                  <Settings size={14} /> Configuración de Cuenta
                </button>
                <button className="dropdown-item" onClick={() => window.open('https://wa.me/59168754870', '_blank')}>
                  <LifeBuoy size={14} /> Centro de Ayuda
                </button>
              </div>
              <div style={{ padding: '8px', borderTop: '1px solid var(--border-color)' }}>
                <button className="dropdown-item text-red" onClick={() => { if (onClose) onClose(); onLogout(); }}>
                  <LogOut size={14} /> Cerrar Sesión
                </button>
              </div>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" onClick={handleNavClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Home size={20} />
            <span>Resumen</span>
          </NavLink>
          <NavLink to="/citas" onClick={handleNavClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <CalendarClock size={20} />
            <span>Citas / Agenda</span>
          </NavLink>
          <NavLink to="/horarios" onClick={handleNavClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Clock size={20} />
            <span>Horarios</span>
          </NavLink>
          
          {!isTrabajador && (
            <>
              <NavLink to="/zonas" onClick={handleNavClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Map size={20} />
                <span>Mapa / Zonas</span>
              </NavLink>
              <NavLink to="/trabajadores" onClick={handleNavClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Users size={20} />
                <span>Trabajadores</span>
              </NavLink>
              <NavLink to="/clientes" onClick={handleNavClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <CarFront size={20} />
                <span>Clientes</span>
              </NavLink>
              <NavLink to="/servicios" onClick={handleNavClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Package size={20} />
                <span>Servicios</span>
              </NavLink>
              <NavLink to="/promos" onClick={handleNavClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Tag size={20} />
                <span>Promos</span>
              </NavLink>
              <NavLink to="/metodos-pago" onClick={handleNavClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <CreditCard size={20} />
                <span>Métodos de Pago</span>
              </NavLink>
              <NavLink to="/admin-bot" onClick={handleNavClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Bot size={20} />
                <span>Admin Bot</span>
              </NavLink>
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px', paddingLeft: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Nómina (Trabajadores)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button 
                className={`nav-item ${isLiquidacionOpen ? 'active' : ''}`}
                style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', justifyContent: 'space-between' }}
                onClick={(e) => { e.preventDefault(); setIsLiquidacionOpen(!isLiquidacionOpen); setIsAnticiposOpen(false); }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Wallet size={20} />
                  <span>Liquidación</span>
                </div>
                <ChevronDown size={14} style={{ transform: isLiquidacionOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              {isLiquidacionOpen && (
                <div style={{ paddingLeft: '32px', display: 'flex', flexDirection: 'column', gap: '4px', animation: 'fadeIn 0.2s' }}>
                  {trabajadores.length === 0 ? (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No hay trabajadores</span>
                  ) : (
                    trabajadores.map(t => (
                      <button key={t.id} onClick={() => { setSelectedWorkerForStats(t); handleNavClick(); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '10px 0', fontSize: '13px', width: '100%', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                          <User size={14} /> 
                          <span style={{ fontWeight: '500' }}>{t.nombre}</span>
                        </div>
                        <div style={{ paddingLeft: '22px', fontSize: '11px', display: 'flex', gap: '8px' }}>
                          <span style={{ color: '#10b981', fontWeight: 'bold' }}>Bs {t.ganancias || 0}</span>
                          <span style={{ opacity: 0.6 }}>• {t.ventas || 0} ventas</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button 
                className={`nav-item ${isAnticiposOpen ? 'active' : ''}`}
                style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', justifyContent: 'space-between' }}
                onClick={(e) => { e.preventDefault(); setIsAnticiposOpen(!isAnticiposOpen); setIsLiquidacionOpen(false); }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Banknote size={20} />
                  <span>Anticipos</span>
                </div>
                <ChevronDown size={14} style={{ transform: isAnticiposOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              {isAnticiposOpen && (
                <div style={{ paddingLeft: '32px', display: 'flex', flexDirection: 'column', gap: '4px', animation: 'fadeIn 0.2s' }}>
                  {trabajadores.length === 0 ? (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No hay trabajadores</span>
                  ) : (
                    trabajadores.map(t => (
                      <button key={t.id} onClick={() => { setSelectedWorkerForStats(t); handleNavClick(); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '10px 0', fontSize: '13px', width: '100%', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                          <User size={14} /> 
                          <span style={{ fontWeight: '500' }}>{t.nombre}</span>
                        </div>
                        <div style={{ paddingLeft: '22px', fontSize: '11px', display: 'flex', gap: '8px' }}>
                          <span style={{ color: '#10b981', fontWeight: 'bold' }}>Bs {t.ganancias || 0}</span>
                          <span style={{ opacity: 0.6 }}>• {t.ventas || 0} ventas</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          </>
          )}
        </nav>

        {selectedWorkerForStats && (
          <WorkerStatsModal 
            worker={selectedWorkerForStats} 
            currentUser={user}
            onClose={() => setSelectedWorkerForStats(null)} 
          />
        )}

      </aside>
    </>
  );
}

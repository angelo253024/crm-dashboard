import React from 'react';
import { Link } from 'react-router-dom';
import { Car, Heart, Droplets, Star, ArrowRight, Moon, Sun } from 'lucide-react';

export default function LandingPage({ isDarkMode, toggleTheme }) {
  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <img 
          src="/logo.png" 
          alt="Lavamóvil Norte" 
          className="landing-logo-img"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        {/* Fallback Nav */}
        <div style={{ display: 'none', alignItems: 'center', lineHeight: '1.1' }}>
          <div style={{ display: 'flex', alignItems: 'center', fontWeight: 900, fontSize: '24px' }}>
            <span style={{ color: '#1E4C9A' }}>LAVA</span>
            <span style={{ color: '#1CA9C9', margin: '0 2px' }}>M</span>
            <span style={{ color: '#1E4C9A' }}>ÓVIL</span>
          </div>
        </div>
        
        <div className="landing-links">
          <a href="#">Inicio</a>
          <a href="#">Servicios</a>
          <a href="#">Nosotros</a>
          <a href="#">Beneficios</a>
          <a href="#">Testimonios</a>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={toggleTheme} className="theme-toggle-btn" aria-label="Toggle theme">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <Link to="/login" className="btn-landing-primary">
            Acceso Empleados
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="landing-hero">
        <div className="landing-subtitle">
          LAVADO DE AUTOS A DOMICILIO • SANTA CRUZ, BOLIVIA
        </div>
        
        <img 
          src="/logo.png" 
          alt="Lavamóvil Norte" 
          className="landing-logo-hero"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }}
        />
        {/* Fallback si no suben la imagen */}
        <div style={{ display: 'none', marginBottom: '24px', animation: 'fadeUp 0.8s ease-out 0.4s forwards', opacity: 0 }}>
          <div className="landing-title">
            <div className="landing-title-icon">
              <Droplets size={48} />
            </div>
            <span style={{ color: '#1E4C9A', fontSize: '64px', fontWeight: 900 }}>LAVA</span>
            <span style={{ color: '#1CA9C9', margin: '0 -5px', fontSize: '64px', fontWeight: 900 }}>M</span>
            <span style={{ color: '#1E4C9A', fontSize: '64px', fontWeight: 900 }}>ÓVIL</span>
          </div>
          <div style={{ fontSize: '48px', fontWeight: 900, color: '#1CA9C9', marginTop: '-10px', letterSpacing: '8px' }}>
            NORTE
          </div>
        </div>

        <h1 className="landing-description">
          Limpieza profunda que eleva tu vehículo
        </h1>
        
        <p className="landing-text">
          Un servicio premium de autolavado a domicilio con equipos profesionales, 
          productos ecológicos y atención personalizada en cualquier parte de Santa Cruz.
        </p>

        <div className="landing-actions">
          <Link to="/reservar" className="btn-landing-large">
            Reservar Ahora <ArrowRight size={20} />
          </Link>
          <a href="#" className="landing-link-secondary">
            Conoce los paquetes
          </a>
        </div>

        {/* Stats */}
        <div className="landing-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <Heart size={24} />
            </div>
            <div className="stat-value">2,000+</div>
            <div className="stat-label">Clientes felices</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <Droplets size={24} />
            </div>
            <div className="stat-value">50+</div>
            <div className="stat-label">Zonas de cobertura</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <Star size={24} />
            </div>
            <div className="stat-value">4.9</div>
            <div className="stat-label">Calificación promedio</div>
          </div>
        </div>
      </main>
    </div>
  );
}

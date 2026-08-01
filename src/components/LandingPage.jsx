import React from 'react';
import { Link } from 'react-router-dom';
import { Car, Heart, Droplets, Star, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <Car size={24} />
          <span>LAVAMÓVIL</span>
        </div>
        
        <div className="landing-links">
          <a href="#">Inicio</a>
          <a href="#">Servicios</a>
          <a href="#">Nosotros</a>
          <a href="#">Beneficios</a>
          <a href="#">Testimonios</a>
        </div>
        
        <div>
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
        
        <div className="landing-title">
          <div className="landing-title-icon">
            <Car size={48} />
          </div>
          <span>LAVAMÓVIL</span>
        </div>
        <div className="landing-title" style={{ fontSize: '64px', color: '#ccc', marginTop: '-20px', marginBottom: '24px' }}>
          NORTE
        </div>

        <h1 className="landing-description">
          Limpieza profunda que eleva tu vehículo
        </h1>
        
        <p className="landing-text">
          Un servicio premium de autolavado a domicilio con equipos profesionales, 
          productos ecológicos y atención personalizada en cualquier parte de Santa Cruz.
        </p>

        <div className="landing-actions">
          <a href="#" className="btn-landing-large">
            Reservar Ahora <ArrowRight size={20} />
          </a>
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

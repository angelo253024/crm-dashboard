import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Car, Heart, Droplets, Star, ArrowRight, Moon, Sun, MessageSquare, Shield, Clock, Zap, MapPin, CheckCircle } from 'lucide-react';
import InstallAppButton from './InstallAppButton';

export default function LandingPage({ isDarkMode, toggleTheme }) {
  
  // Smooth scroll handler
  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav nav-sticky">
        <img 
          src="/logo.png" 
          alt="Lavamóvil Norte" 
          className="landing-logo-img"
          style={{ cursor: 'pointer' }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        {/* Fallback Nav */}
        <div style={{ display: 'none', alignItems: 'center', lineHeight: '1.1', cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div style={{ display: 'flex', alignItems: 'center', fontWeight: 900, fontSize: '24px' }}>
            <span style={{ color: '#1E4C9A' }}>LAVA</span>
            <span style={{ color: '#1CA9C9', margin: '0 2px' }}>M</span>
            <span style={{ color: '#1E4C9A' }}>ÓVIL</span>
          </div>
        </div>
        
        <div className="landing-links">
          <a href="#" onClick={(e) => scrollToSection(e, 'hero')} className="link-hover-effect">Inicio</a>
          <a href="#beneficios" onClick={(e) => scrollToSection(e, 'beneficios')} className="link-hover-effect">Beneficios</a>
          <a href="#como-funciona" onClick={(e) => scrollToSection(e, 'como-funciona')} className="link-hover-effect">Cómo Funciona</a>
          <a href="#confianza" onClick={(e) => scrollToSection(e, 'confianza')} className="link-hover-effect">Confianza</a>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={toggleTheme} className="theme-toggle-btn" aria-label="Toggle theme">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main id="hero" className="landing-hero" style={{ minHeight: '90vh', justifyContent: 'center', paddingBottom: '32px' }}>
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

        <h1 className="landing-description" style={{ fontSize: '32px', marginBottom: '16px' }}>
          Limpieza profunda que <span style={{ color: '#1CA9C9' }}>eleva tu vehículo</span>
        </h1>
        
        <p className="landing-text" style={{ fontSize: '18px', maxWidth: '700px' }}>
          Un servicio premium de autolavado a domicilio con equipos profesionales, 
          productos ecológicos y atención personalizada en cualquier parte de Santa Cruz.
        </p>

        <div className="landing-actions" style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '32px' }}>
          <Link to="/reservar" className="btn-landing-large pulse-glow" style={{ padding: '18px 40px', fontSize: '18px' }}>
            Reservar Ahora <ArrowRight size={22} />
          </Link>
          <button 
            className="btn-landing-large" 
            style={{ backgroundColor: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '18px 32px', boxShadow: 'none' }}
            onClick={() => window.dispatchEvent(new CustomEvent('openChatBot'))}
          >
            <MessageSquare size={20} style={{ marginRight: '8px', color: '#1CA9C9' }} />
            Asistente IA
          </button>
          
          <InstallAppButton />
        </div>

        {/* Trust Badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', flexWrap: 'wrap', animation: 'fadeUp 0.8s ease-out 1.2s forwards', opacity: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
            <Star size={18} color="#fbbf24" fill="#fbbf24" /> 4.9/5 en Google
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
            <Shield size={18} color="#1CA9C9" /> Seguro contra daños
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
            <Clock size={18} color="#10b981" /> Atención puntual
          </div>
        </div>
      </main>

      {/* Sección Beneficios */}
      <section id="beneficios" style={{ padding: '80px 24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-main)' }}>
            ¿Por qué elegir <span style={{ color: '#1CA9C9' }}>Lavamóvil Norte</span>?
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
            Diseñado para dueños exigentes que valoran su tiempo y buscan un acabado impecable.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
          
          <div className="service-glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ backgroundColor: 'rgba(28, 169, 201, 0.1)', padding: '16px', borderRadius: '16px', marginBottom: '24px', color: '#1CA9C9' }}>
              <MapPin size={32} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-main)' }}>A Domicilio</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Donde estés, llegamos nosotros. Tu auto limpio en casa o en el trabajo, sin hacer filas.
            </p>
          </div>

          <div className="service-glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ backgroundColor: 'rgba(28, 169, 201, 0.1)', padding: '16px', borderRadius: '16px', marginBottom: '24px', color: '#1CA9C9' }}>
              <Zap size={32} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-main)' }}>Ahorro de Tiempo</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Reserva en menos de 1 minuto desde cualquier dispositivo y continúa con tu día.
            </p>
          </div>

          <div className="service-glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ backgroundColor: 'rgba(28, 169, 201, 0.1)', padding: '16px', borderRadius: '16px', marginBottom: '24px', color: '#1CA9C9' }}>
              <Car size={32} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-main)' }}>Calidad Premium</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Utilizamos microfibras especiales, ceras protectoras y técnicas seguras para tu pintura.
            </p>
          </div>

          <div className="service-glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ backgroundColor: 'rgba(28, 169, 201, 0.1)', padding: '16px', borderRadius: '16px', marginBottom: '24px', color: '#1CA9C9' }}>
              <Shield size={32} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-main)' }}>Personal Seguro</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Trabajadores altamente capacitados, verificados e identificados para tu total tranquilidad.
            </p>
          </div>

        </div>
      </section>

      {/* Sección Cómo Funciona */}
      <section id="como-funciona" style={{ padding: '80px 24px', backgroundColor: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-main)' }}>
              Tu auto impecable en <span style={{ color: '#1CA9C9' }}>3 simples pasos</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '40px', position: 'relative' }}>
            
            <div style={{ textAlign: 'center', zIndex: 1 }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #1E4C9A 0%, #1CA9C9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '900', color: '#fff', margin: '0 auto 24px auto', boxShadow: '0 10px 25px rgba(28, 169, 201, 0.3)' }}>
                1
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-main)' }}>Elige tu servicio</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>Ingresa a nuestro catálogo, elige el paquete ideal para tu vehículo y confirma tu ubicación.</p>
            </div>

            <div style={{ textAlign: 'center', zIndex: 1 }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #1E4C9A 0%, #1CA9C9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '900', color: '#fff', margin: '0 auto 24px auto', boxShadow: '0 10px 25px rgba(28, 169, 201, 0.3)' }}>
                2
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-main)' }}>Vamos hacia ti</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>Nuestro trabajador más cercano aceptará tu solicitud y se dirigirá a tu ubicación de inmediato.</p>
            </div>

            <div style={{ textAlign: 'center', zIndex: 1 }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #1E4C9A 0%, #1CA9C9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '900', color: '#fff', margin: '0 auto 24px auto', boxShadow: '0 10px 25px rgba(28, 169, 201, 0.3)' }}>
                3
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-main)' }}>Disfruta</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>Relájate mientras realizamos un lavado profundo. Tu vehículo quedará como nuevo.</p>
            </div>

          </div>
        </div>
      </section>

      {/* Sección Confianza & Stats */}
      <section id="confianza" style={{ padding: '80px 24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        
        <div className="landing-stats" style={{ flexWrap: 'wrap', opacity: 1, animation: 'none' }}>
          <div className="stat-card" style={{ flex: '1 1 250px' }}>
            <div className="stat-icon">
              <Heart size={28} />
            </div>
            <div className="stat-value">2,000+</div>
            <div className="stat-label">Clientes felices</div>
          </div>
          
          <div className="stat-card" style={{ flex: '1 1 250px' }}>
            <div className="stat-icon">
              <Droplets size={28} />
            </div>
            <div className="stat-value">50+</div>
            <div className="stat-label">Zonas de cobertura</div>
          </div>
          
          <div className="stat-card" style={{ flex: '1 1 250px' }}>
            <div className="stat-icon">
              <Star size={28} />
            </div>
            <div className="stat-value">4.9/5</div>
            <div className="stat-label">Calificación promedio</div>
          </div>
        </div>

      </section>

      {/* Final CTA */}
      <section style={{ padding: '80px 24px', textAlign: 'center', background: 'linear-gradient(180deg, transparent 0%, rgba(28, 169, 201, 0.05) 100%)' }}>
        <h2 style={{ fontSize: '40px', fontWeight: '900', marginBottom: '24px', color: 'var(--text-main)' }}>
          ¿Listo para ver tu auto brillar?
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '18px', maxWidth: '600px', margin: '0 auto 40px auto' }}>
          Únete a miles de clientes en Santa Cruz que ya confían el cuidado de su vehículo a nuestros expertos.
        </p>
        <Link to="/reservar" className="btn-landing-large pulse-glow" style={{ padding: '18px 48px', fontSize: '20px', display: 'inline-flex', margin: '0 auto' }}>
          Agendar mi lavado <ArrowRight size={24} />
        </Link>
      </section>

      {/* Footer minimalista */}
      <footer style={{ padding: '24px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '14px' }}>
        © {new Date().getFullYear()} Lavamóvil Norte. Todos los derechos reservados. Santa Cruz de la Sierra, Bolivia.
      </footer>

    </div>
  );
}

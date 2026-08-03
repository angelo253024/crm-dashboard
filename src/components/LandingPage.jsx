import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Car, Heart, Droplets, Star, ArrowRight, Moon, Sun, MessageSquare } from 'lucide-react';

const PromoAd = ({ onBook }) => {
  return (
    <>
      <style>
        {`
          .promo-ad-wrapper {
            transition: all 0.3s ease;
            width: 100%;
          }
          @media (max-width: 768px) {
            .promo-ad-wrapper {
              transform: scale(0.85);
              transform-origin: top center;
              margin-bottom: -50px;
            }
          }
          @media (max-width: 480px) {
            .promo-ad-wrapper {
              transform: scale(0.75);
              transform-origin: top center;
              margin-bottom: -100px;
            }
          }
        `}
      </style>
      <div className="promo-ad-wrapper" style={{
        background: 'linear-gradient(135deg, #0f3d6b 0%, #1b5b96 100%)',
        borderRadius: '24px',
        padding: '24px',
        color: 'white',
        textAlign: 'center',
        position: 'relative',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        overflow: 'hidden'
      }}>
       {/* Fake diagonal lines using CSS background */}
       <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.02) 20px, rgba(255,255,255,0.02) 40px)',
          pointerEvents: 'none'
       }} />

       <div style={{ position: 'relative', zIndex: 1 }}>
         <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
           <span style={{ backgroundColor: '#fff', color: '#0f3d6b', fontSize: '10px', fontWeight: '900', padding: '2px 6px', borderRadius: '4px' }}>Ad</span>
         </div>
         
         {/* Logo */}
         <div style={{ marginBottom: '16px' }}>
            <div style={{ fontFamily: 'cursive, "Brush Script MT", sans-serif', fontSize: '28px', lineHeight: '1' }}>Lava</div>
            <div style={{ fontFamily: 'cursive, "Brush Script MT", sans-serif', fontSize: '32px', color: '#1ccaff', lineHeight: '1' }}>Móvil</div>
            <div style={{ fontSize: '10px', letterSpacing: '6px', fontWeight: 'bold', marginTop: '4px' }}>N O R T E</div>
         </div>

         {/* Car Image / Icon */}
         <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', height: '110px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', borderBottom: '2px solid #1ccaff' }}>
           <Car size={48} color="#fff" style={{ marginBottom: '8px' }} />
           <span style={{ fontSize: '10px', letterSpacing: '1px' }}>JIMNY • SUZUKI ALTO</span>
         </div>

         {/* Text content */}
         <div style={{ fontFamily: 'cursive, "Brush Script MT", sans-serif', fontSize: '38px', marginBottom: '8px' }}>Lavado</div>
         <div style={{ border: '2px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '6px 20px', display: 'inline-block', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '24px', fontSize: '14px' }}>
           CLÁSICO
         </div>

         {/* Circle P */}
         <div style={{ width: '64px', height: '64px', backgroundColor: '#1ccaff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', fontSize: '32px', fontWeight: '900', color: '#0f3d6b' }}>
           P
         </div>

         <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Ideal para autos pequeños</div>

         <div style={{ fontSize: '56px', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px', lineHeight: 1 }}>
           <span style={{ fontSize: '24px' }}>Bs.</span> 60
         </div>
         <div style={{ fontSize: '11px', letterSpacing: '2px', fontWeight: 'bold', color: '#1ccaff', marginBottom: '24px' }}>
           PRECIO CLÁSICO
         </div>

         {/* Premium Box */}
         <div style={{ border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
           <div style={{ fontSize: '13px', fontWeight: 'bold' }}>VERSIÓN PREMIUM</div>
           <div style={{ fontSize: '18px', fontWeight: '900', color: '#1ccaff' }}>Bs.120</div>
         </div>

         <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', marginBottom: '20px', lineHeight: '1.4' }}>
           *En caso de exceso de pelo o barro, se cobrará un costo adicional de 10 a 20Bs.
         </div>

         {/* CTA */}
         <button 
           onClick={onBook}
           style={{ backgroundColor: '#1ccaff', color: '#0f3d6b', border: 'none', width: '100%', padding: '16px', borderRadius: '12px', fontSize: '16px', fontWeight: '900', cursor: 'pointer', transition: 'transform 0.2s' }}
           onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
           onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
         >
           ¡Agenda tu lavado hoy!
           <div style={{ fontSize: '11px', fontWeight: '600', marginTop: '4px', color: '#0f3d6b' }}>
             Visítanos en Lava Móvil Norte
           </div>
         </button>
       </div>
      </div>
    </>
  )
}

export default function LandingPage({ isDarkMode, toggleTheme }) {
  const navigate = useNavigate();
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

      {/* Hero Section Wrapper */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '40px', padding: '40px 5%', maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Hero Section */}
        <main className="landing-hero" style={{ flex: '1 1 500px', maxWidth: '600px', margin: 0, padding: 0 }}>
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

        <div className="landing-actions" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/reservar" className="btn-landing-large">
            Reservar Ahora <ArrowRight size={20} />
          </Link>
          <button 
            className="btn-landing-large" 
            style={{ backgroundColor: 'transparent', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan)' }}
            onClick={() => window.dispatchEvent(new CustomEvent('openChatBot'))}
          >
            <MessageSquare size={20} style={{ marginRight: '8px' }} />
            Asistente IA
          </button>
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

      {/* Lateral Ad */}
      <div style={{ flex: '0 0 320px', maxWidth: '400px', marginLeft: 'auto' }}>
        <PromoAd onBook={() => navigate('/reservar', { state: { openService: 'CLAS-P00' } })} />
      </div>

      </div>
    </div>
  );
}

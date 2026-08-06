import React from 'react';

export default function BackgroundEffects() {
  return (
    <div className="bg-effects-container" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: -1,
      pointerEvents: 'none',
      overflow: 'hidden'
    }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0.04" />
            <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity="0.04" />
          </linearGradient>

          <pattern id="hexPattern" width="60" height="103.923" patternUnits="userSpaceOnUse">
             <path d="M 60 25.98 l -30 17.32 l -30 -17.32 l 0 -34.64 l 30 -17.32 l 30 17.32 Z" fill="none" stroke="var(--text-main)" strokeWidth="0.5" strokeOpacity="0.015" />
             <path d="M 30 77.94 l -30 17.32 l -30 -17.32 l 0 -34.64 l 30 -17.32 l 30 17.32 Z" fill="none" stroke="var(--text-main)" strokeWidth="0.5" strokeOpacity="0.015" />
          </pattern>

          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="40" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Gradiente radial suave que se mueve */}
        <ellipse className="glow-orb orb-1" cx="20%" cy="30%" rx="40%" ry="50%" fill="url(#glowGrad)" filter="url(#glow)" />
        <ellipse className="glow-orb orb-2" cx="80%" cy="70%" rx="45%" ry="55%" fill="url(#glowGrad)" filter="url(#glow)" />

        {/* Patrón Hexagonal / Blueprint */}
        <rect width="100%" height="100%" fill="url(#hexPattern)" />

        {/* Líneas Aerodinámicas (Flujo de agua / Aerodinámica) */}
        <g stroke="var(--accent-cyan)" strokeWidth="1" strokeOpacity="0.04" fill="none">
          <path className="flow-line line-1" d="M -100,200 C 300,400 600,0 1000,500 S 1600,300 2000,600" />
          <path className="flow-line line-2" d="M -100,500 C 400,200 800,800 1200,400 S 1800,600 2000,200" />
          <path className="flow-line line-3" d="M -100,800 C 200,500 500,900 900,300 S 1500,200 2000,800" />
          <path className="flow-line line-4" d="M -100,300 C 500,100 700,600 1100,200 S 1700,500 2000,100" />
        </g>

        {/* Partículas luminosas (Coating reflections) */}
        <g fill="var(--accent-blue)" fillOpacity="0.1">
          <circle className="particle p-1" cx="15%" cy="80%" r="3" />
          <circle className="particle p-2" cx="45%" cy="90%" r="2" />
          <circle className="particle p-3" cx="75%" cy="85%" r="4" />
          <circle className="particle p-4" cx="30%" cy="20%" r="2" />
          <circle className="particle p-5" cx="85%" cy="30%" r="3" />
          <circle className="particle p-6" cx="60%" cy="40%" r="2" />
          <circle className="particle p-7" cx="20%" cy="50%" r="1" />
        </g>
      </svg>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes floatOrb1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(5%, 5%) scale(1.1); }
        }
        @keyframes floatOrb2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-5%, -5%) scale(1.1); }
        }
        .glow-orb { transform-origin: center; }
        .orb-1 { animation: floatOrb1 20s ease-in-out infinite; }
        .orb-2 { animation: floatOrb2 25s ease-in-out infinite reverse; }

        @keyframes flowLine {
          0% { stroke-dashoffset: 3000; }
          100% { stroke-dashoffset: 0; }
        }
        .flow-line {
          stroke-dasharray: 3000;
          animation: flowLine 40s linear infinite;
        }
        .line-1 { animation-duration: 50s; }
        .line-2 { animation-duration: 45s; animation-direction: reverse; }
        .line-3 { animation-duration: 55s; }
        .line-4 { animation-duration: 60s; animation-direction: reverse; }

        @keyframes floatParticle {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          10% { opacity: 0.1; }
          90% { opacity: 0.1; }
          100% { transform: translateY(-120px) scale(0.5); opacity: 0; }
        }
        .particle {
          animation: floatParticle 10s linear infinite;
        }
        .p-1 { animation-duration: 12s; animation-delay: 0s; }
        .p-2 { animation-duration: 15s; animation-delay: 3s; }
        .p-3 { animation-duration: 10s; animation-delay: 5s; }
        .p-4 { animation-duration: 18s; animation-delay: 1s; }
        .p-5 { animation-duration: 14s; animation-delay: 4s; }
        .p-6 { animation-duration: 20s; animation-delay: 7s; }
        .p-7 { animation-duration: 16s; animation-delay: 2s; }
      `}} />
    </div>
  );
}

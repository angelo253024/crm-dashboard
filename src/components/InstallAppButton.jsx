import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  if (isInstalled) {
    return null; // Ocultar si ya está instalada
  }

  return (
    <button 
      onClick={handleInstallClick} 
      disabled={!isInstallable}
      className={`btn-landing-large ${isInstallable ? 'pulse-glow' : ''}`}
      style={{ 
        backgroundColor: isInstallable ? 'var(--accent-green)' : 'transparent', 
        color: isInstallable ? '#fff' : 'var(--text-muted)', 
        border: isInstallable ? 'none' : '1px solid var(--border-color)', 
        padding: '12px 24px', 
        boxShadow: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        opacity: isInstallable ? 1 : 0.6,
        cursor: isInstallable ? 'pointer' : 'not-allowed'
      }}
      title={isInstallable ? "Descargar Lavamóvil App" : "Instalación nativa no disponible en este navegador o dispositivo"}
    >
      <Download size={20} />
      {isInstallable ? 'Descargar App' : 'App Disponible'}
    </button>
  );
}

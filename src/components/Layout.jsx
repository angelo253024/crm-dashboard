import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children, isDarkMode, toggleTheme, user, setUser, onLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  // Auto-close sidebar on route change on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-container">
      <Sidebar 
        user={user} 
        onLogout={onLogout} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className="main-content">
        <Header 
          isDarkMode={isDarkMode} 
          toggleTheme={toggleTheme} 
          user={user} 
          setUser={setUser} 
          onLogout={onLogout}
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        />
        <main>{children}</main>
      </div>
    </div>
  );
}


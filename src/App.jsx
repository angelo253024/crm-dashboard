import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import Citas from './components/Citas'
import Zonas from './components/Zonas'
import Trabajadores from './components/Trabajadores'
import Clientes from './components/Clientes'
import AdminServicios from './components/AdminServicios'
import AdminPromos from './components/AdminPromos'
import AdminBot from './components/AdminBot'
import AdminHorarios from './components/AdminHorarios'
import ServiciosCatalog from './components/ServiciosCatalog'
import LandingPage from './components/LandingPage'
import ChatBotWidget from './components/ChatBotWidget'

function App() {
  const [user, setUserState] = useState(() => {
    const savedUser = localStorage.getItem('crm_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const setUser = (newUser) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem('crm_user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('crm_user');
    }
  };
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check local storage first
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return false; // Default to light mode as requested
  });

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  // Componente envoltorio para proteger las rutas internas
  const ProtectedRoute = ({ children }) => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    return (
      <Layout isDarkMode={isDarkMode} toggleTheme={toggleTheme} user={user} setUser={setUser}>
        {children}
      </Layout>
    );
  };

  return (
    <>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/" element={<LandingPage isDarkMode={isDarkMode} toggleTheme={toggleTheme} />} />
        <Route path="/reservar" element={<ServiciosCatalog isDarkMode={isDarkMode} toggleTheme={toggleTheme} />} />
        <Route 
          path="/login" 
          element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={(loggedInUser) => setUser(loggedInUser)} />} 
        />

        {/* Rutas Protegidas (CRM Interno) */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard user={user} /></ProtectedRoute>} />
        <Route path="/citas" element={<ProtectedRoute><Citas /></ProtectedRoute>} />
        <Route path="/zonas" element={<ProtectedRoute><Zonas /></ProtectedRoute>} />
        <Route path="/trabajadores" element={<ProtectedRoute><Trabajadores /></ProtectedRoute>} />
        <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
        <Route path="/servicios" element={<ProtectedRoute><AdminServicios /></ProtectedRoute>} />
        <Route path="/promos" element={<ProtectedRoute><AdminPromos /></ProtectedRoute>} />
        <Route path="/admin-bot" element={<ProtectedRoute><AdminBot /></ProtectedRoute>} />
        <Route path="/horarios" element={<ProtectedRoute><AdminHorarios user={user} /></ProtectedRoute>} />
        
        {/* Cualquier ruta que no exista redirige a la Landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ChatBotWidget />
    </>
  )
}

export default App

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
import ServiciosCatalog from './components/ServiciosCatalog'
import LandingPage from './components/LandingPage'

function App() {
  const [user, setUser] = useState(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check local storage or system preference on initial load
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
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
    <Routes>
      {/* Rutas Públicas */}
      <Route path="/" element={<LandingPage isDarkMode={isDarkMode} toggleTheme={toggleTheme} />} />
      <Route path="/reservar" element={<ServiciosCatalog isDarkMode={isDarkMode} toggleTheme={toggleTheme} />} />
      <Route 
        path="/login" 
        element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={(loggedInUser) => setUser(loggedInUser)} />} 
      />

      {/* Rutas Protegidas (CRM Interno) */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/citas" element={<ProtectedRoute><Citas /></ProtectedRoute>} />
      <Route path="/zonas" element={<ProtectedRoute><Zonas /></ProtectedRoute>} />
      <Route path="/trabajadores" element={<ProtectedRoute><Trabajadores /></ProtectedRoute>} />
      <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
      <Route path="/servicios" element={<ProtectedRoute><AdminServicios /></ProtectedRoute>} />
      
      {/* Cualquier ruta que no exista redirige a la Landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

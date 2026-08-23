import React, { useState, useEffect, Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import OneSignal from 'react-onesignal'

// Layout y Componentes Globales Críticos (no diferidos)
import Layout from './components/Layout'
import BackgroundEffects from './components/BackgroundEffects'
import ChatBotWidget from './components/ChatBotWidget'

// Lazy Loading para Vistas (Code Splitting)
const LandingPage = lazy(() => import('./components/LandingPage'))
const ServiciosCatalog = lazy(() => import('./components/ServiciosCatalog'))
const Login = lazy(() => import('./components/Login'))
const Dashboard = lazy(() => import('./components/Dashboard'))
const MotoDashboard = lazy(() => import('./components/MotoDashboard'))
const Citas = lazy(() => import('./components/Citas'))
const Zonas = lazy(() => import('./components/Zonas'))
const Trabajadores = lazy(() => import('./components/Trabajadores'))
const Clientes = lazy(() => import('./components/Clientes'))
const AdminServicios = lazy(() => import('./components/AdminServicios'))
const AdminPromos = lazy(() => import('./components/AdminPromos'))
const AdminMetodosPago = lazy(() => import('./components/AdminMetodosPago'))
const AdminBot = lazy(() => import('./components/AdminBot'))
const AdminHorarios = lazy(() => import('./components/AdminHorarios'))

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

  const handleLogout = async () => {
    if (user && user.id !== 'local-demo') {
      try {
        const { supabase } = await import('./supabase');
        await supabase.from('trabajadores').update({ estado: 'Inactivo' }).eq('id', user.id);
        const today = new Date().toISOString().split('T')[0];
        await supabase
          .from('trabajador_horarios')
          .update({ hora_salida: new Date().toISOString() })
          .eq('trabajador_id', user.id)
          .eq('fecha', today)
          .is('hora_salida', null);
      } catch (err) {
        console.error("Error setting user to Inactivo:", err);
      }
    }
    setUser(null);
  };

  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check local storage first
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return false; // Default to light mode as requested
  });

  // Inicializar OneSignal
  useEffect(() => {
    const initOneSignal = async () => {
      try {
        await OneSignal.init({
          appId: "a3f26ad5-6743-4eae-b720-6e7b2b3a36c6",
          allowLocalhostAsSecureOrigin: true,
          notifyButton: {
            enable: true, // Muestra una campanita para suscribirse
          },
        });
      } catch (error) {
        console.error("Error al inicializar OneSignal:", error);
      }
    };
    initOneSignal();
  }, []);

  // Sincronizar usuario con OneSignal
  useEffect(() => {
    if (user && user.id && user.id !== 'local-demo') {
      try {
        // Enlazar el dispositivo actual con el ID del trabajador
        if (OneSignal.User) {
          OneSignal.login(user.id);
          
          // Opcional: Obtener el push subscription ID para guardarlo en BD si se requiere
          const handlePushSubscription = async () => {
             if (OneSignal.User.PushSubscription.id) {
                 const { supabase } = await import('./supabase');
                 await supabase
                     .from('trabajadores')
                     .update({ onesignal_id: OneSignal.User.PushSubscription.id })
                     .eq('id', user.id);
             }
          };
          
          // Escuchar cambios de suscripción
          OneSignal.User.PushSubscription.addEventListener('change', handlePushSubscription);
          // Ejecutar por si ya estaba suscrito
          handlePushSubscription();
        }
      } catch (e) {
        console.error("Error logging to OneSignal", e);
      }
    } else {
       if (OneSignal.User) {
          OneSignal.logout();
       }
    }
  }, [user]);

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
      <Layout isDarkMode={isDarkMode} toggleTheme={toggleTheme} user={user} setUser={setUser} onLogout={handleLogout}>
        {children}
      </Layout>
    );
  };

  // Fallback UI para la carga de componentes
  const SuspenseFallback = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px', color: 'var(--text-muted)' }}>
      <Loader2 size={40} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
      <p>Cargando aplicación...</p>
    </div>
  );

  return (
    <>
      <BackgroundEffects />
      <Suspense fallback={<SuspenseFallback />}>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/" element={<LandingPage isDarkMode={isDarkMode} toggleTheme={toggleTheme} />} />
          <Route path="/reservar" element={<ServiciosCatalog isDarkMode={isDarkMode} toggleTheme={toggleTheme} />} />
          <Route 
            path="/login" 
            element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={(loggedInUser) => setUser(loggedInUser)} />} 
          />

          {/* Rutas Protegidas (CRM Interno) */}
          <Route path="/dashboard" element={<ProtectedRoute>{user?.rol === 'Trabajador' ? <MotoDashboard user={user} /> : <Dashboard />}</ProtectedRoute>} />
          <Route path="/citas" element={<ProtectedRoute><Citas /></ProtectedRoute>} />
          <Route path="/zonas" element={<ProtectedRoute><Zonas /></ProtectedRoute>} />
          <Route path="/trabajadores" element={<ProtectedRoute><Trabajadores /></ProtectedRoute>} />
          <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
          <Route path="/servicios" element={<ProtectedRoute><AdminServicios /></ProtectedRoute>} />
          <Route path="/promos" element={<ProtectedRoute><AdminPromos /></ProtectedRoute>} />
          <Route path="/metodos-pago" element={<ProtectedRoute><AdminMetodosPago /></ProtectedRoute>} />
          <Route path="/admin-bot" element={<ProtectedRoute><AdminBot /></ProtectedRoute>} />
          <Route path="/horarios" element={<ProtectedRoute><AdminHorarios user={user} /></ProtectedRoute>} />
          
          {/* Cualquier ruta que no exista redirige a la Landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <ChatBotWidget />
    </>
  )
}

export default App
// Trigger vercel deployment

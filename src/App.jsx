import React, { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import Login from './components/Login'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <Layout isDarkMode={isDarkMode} toggleTheme={toggleTheme}>
      <Dashboard />
    </Layout>
  )
}

export default App
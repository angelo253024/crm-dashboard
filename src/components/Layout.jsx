import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children, isDarkMode, toggleTheme, user, setUser, onLogout }) {
  return (
    <div className="app-container">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="main-content">
        <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} user={user} setUser={setUser} onLogout={onLogout} />
        <main>{children}</main>
      </div>
    </div>
  );
}

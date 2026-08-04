import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children, isDarkMode, toggleTheme, user, setUser }) {
  return (
    <div className="app-container">
      <Sidebar user={user} />
      <div className="main-content">
        <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} user={user} setUser={setUser} />
        <main>{children}</main>
      </div>
    </div>
  );
}

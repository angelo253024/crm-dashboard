import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children, isDarkMode, toggleTheme, user }) {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} user={user} />
        <main>{children}</main>
      </div>
    </div>
  );
}

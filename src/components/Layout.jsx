import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children, isDarkMode, toggleTheme }) {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        <main>{children}</main>
      </div>
    </div>
  );
}

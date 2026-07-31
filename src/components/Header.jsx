import React from 'react';
import { Search, Gift, Bell, ChevronDown } from 'lucide-react';

export default function Header() {
  return (
    <header className="header">
      <div className="search-bar">
        <Search size={16} className="text-muted" />
        <input type="text" placeholder="Search" />
        <div className="text-small text-muted" style={{ backgroundColor: '#e5e7eb', padding: '2px 6px', borderRadius: '4px' }}>⌘ K</div>
      </div>
      
      <div className="header-actions">
        <button className="icon-btn">
          <Gift size={18} />
        </button>
        <button className="icon-btn">
          <Bell size={18} />
        </button>
        <div className="user-profile">
          <img src="https://i.pravatar.cc/150?u=u2" alt="User" className="avatar" />
          <div>
            <div className="text-small font-semibold">Angelo Israel Miranda Vivero</div>
            <div className="text-small text-muted">ID: 4827682</div>
          </div>
          <ChevronDown size={16} className="text-muted" />
        </div>
      </div>
    </header>
  );
}

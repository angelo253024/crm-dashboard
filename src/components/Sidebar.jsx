import React from 'react';
import { Home, PlusSquare, Network, CreditCard, Bot, Blocks, ChevronDown, Lock } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        emitly
      </div>
      
      <div className="sidebar-workspace">
        <div className="workspace-icon">
          <Lock size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="text-small font-semibold">My Workspace</div>
          <div className="text-small text-muted" style={{ fontWeight: 400 }}>Free plan</div>
        </div>
        <ChevronDown size={16} className="text-muted" />
      </div>

      <nav className="sidebar-nav">
        <a href="#" className="nav-item active">
          <Home size={20} />
          <span>Overview</span>
        </a>
        <a href="#" className="nav-item">
          <PlusSquare size={20} />
          <span>Create campaign</span>
        </a>
        <a href="#" className="nav-item">
          <Network size={20} />
          <span>Automation</span>
        </a>
        <a href="#" className="nav-item">
          <CreditCard size={20} />
          <span>Subscriptions</span>
        </a>
        <a href="#" className="nav-item">
          <Bot size={20} />
          <span>AI Chatbot</span>
        </a>
        <a href="#" className="nav-item">
          <Blocks size={20} />
          <span>Integrations</span>
        </a>
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img src="https://i.pravatar.cc/150?u=u2" alt="User" className="avatar" />
        <div>
          <div className="text-small font-semibold">Angelo Israel Miranda Vivero</div>
          <div className="text-small text-muted" style={{ fontSize: '11px' }}>jamespass@emi.com</div>
        </div>
      </div>
    </aside>
  );
}

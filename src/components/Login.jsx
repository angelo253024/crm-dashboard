import React, { useState } from 'react';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { supabase } from '../supabase';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Busca en Supabase si el usuario/nombre coincide con la contraseña
    const { data, error: fetchError } = await supabase
      .from('trabajadores')
      .select('*')
      .ilike('nombre', email.trim())
      .eq('password', password)
      .single();

    if (fetchError || !data) {
      if (email === 'angelo' && password === '3279869') {
        // Fallback for demo if the db isn't updated yet
        onLogin({ nombre: 'Angelo Miranda', rol: 'Administrador', id: 'local-demo' });
      } else {
        setError('Usuario o contraseña incorrectos');
      }
    } else {
      // Logueado exitosamente, pasamos el objeto del usuario a onLogin
      onLogin(data);
    }
    
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        
        {/* Logo LAVAMOVIL NORTE */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.1', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', fontWeight: 900, fontSize: '32px' }}>
            <span style={{ color: '#1E4C9A' }}>LAVA</span>
            <span style={{ color: '#1CA9C9', margin: '0 2px' }}>M</span>
            <span style={{ color: '#1E4C9A' }}>ÓVIL</span>
          </div>
          <div style={{ color: '#1CA9C9', fontWeight: 700, fontSize: '18px', letterSpacing: '6px' }}>
            NORTE
          </div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Correo o usuario</label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon text-muted" />
              <input 
                type="text" 
                placeholder="tu@correo.com o usuario" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div className="label-row">
              <label>Contraseña</label>
              <a href="#" className="forgot-password">¿Olvidaste tu contraseña?</a>
            </div>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon text-muted" />
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && <div style={{ color: 'var(--accent-red, #ef4444)', fontSize: '13px', textAlign: 'center', marginBottom: '16px' }}>{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Cargando...' : <>Ingresar <ArrowRight size={18} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}

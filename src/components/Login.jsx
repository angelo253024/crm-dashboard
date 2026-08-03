import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, ArrowLeft, MessageCircle } from 'lucide-react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados para recuperación de contraseña
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotUser, setForgotUser] = useState(null);
  const [forgotAnswer, setForgotAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const resetForgotState = () => {
    setShowForgotModal(false);
    setForgotStep(1);
    setForgotUsername('');
    setForgotUser(null);
    setForgotAnswer('');
    setNewPassword('');
    setForgotError('');
    setForgotSuccess('');
  };

  const handleForgotStep1 = async (e) => {
    e.preventDefault();
    setLoading(true);
    setForgotError('');

    const { data, error } = await supabase
      .from('trabajadores')
      .select('*')
      .ilike('nombre', forgotUsername.trim())
      .single();

    if (error || !data) {
      setForgotError('No se encontró el usuario.');
    } else if (!data.pregunta_seguridad) {
      setForgotError('Este usuario no tiene configurada una pregunta de seguridad. Contacta al administrador.');
    } else {
      setForgotUser(data);
      setForgotStep(2);
    }
    setLoading(false);
  };

  const handleForgotStep2 = (e) => {
    e.preventDefault();
    setForgotError('');
    
    // Comparación simple, ignorando mayúsculas y minúsculas
    if (forgotAnswer.trim().toLowerCase() === forgotUser.respuesta_seguridad.trim().toLowerCase()) {
      setForgotStep(3);
    } else {
      setForgotError('Respuesta incorrecta.');
    }
  };

  const handleForgotStep3 = async (e) => {
    e.preventDefault();
    setLoading(true);
    setForgotError('');

    const { error } = await supabase
      .from('trabajadores')
      .update({ password: newPassword })
      .eq('id', forgotUser.id);

    if (error) {
      setForgotError('Error al guardar la nueva contraseña.');
    } else {
      setForgotSuccess('¡Contraseña actualizada correctamente!');
      setTimeout(() => {
        resetForgotState();
        setEmail(forgotUsername);
      }, 2000);
    }
    setLoading(false);
  };

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
      setError('Usuario o contraseña incorrectos');
    } else {
      // Logueado exitosamente, registramos hora_ingreso (Reloj Checador)
      await supabase
        .from('trabajador_horarios')
        .insert([{
          trabajador_id: data.id,
          hora_ingreso: new Date().toISOString()
        }]);
        
      // Cambiamos su estado a disponible
      await supabase
        .from('trabajadores')
        .update({ estado_disponibilidad: 'disponible' })
        .eq('id', data.id);

      // Pasamos el objeto del usuario a onLogin
      onLogin(data);
    }
    
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ position: 'relative' }}>
        <Link to="/" style={{ position: 'absolute', top: '24px', left: '24px', color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '500' }}>
          <ArrowLeft size={16} /> Volver
        </Link>
        
        {/* Logo LAVAMOVIL NORTE */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <img 
            src="/logo.png" 
            alt="Lavamóvil Norte" 
            style={{ height: '80px', width: 'auto', objectFit: 'contain' }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div style={{ display: 'none', flexDirection: 'column', alignItems: 'center', lineHeight: '1.1' }}>
            <div style={{ display: 'flex', alignItems: 'center', fontWeight: 900, fontSize: '32px' }}>
              <span style={{ color: '#1E4C9A' }}>LAVA</span>
              <span style={{ color: '#1CA9C9', margin: '0 2px' }}>M</span>
              <span style={{ color: '#1E4C9A' }}>ÓVIL</span>
            </div>
            <div style={{ color: '#1CA9C9', fontWeight: 700, fontSize: '18px', letterSpacing: '6px' }}>
              NORTE
            </div>
          </div>
        </div>

        <button 
          onClick={(e) => {
            e.preventDefault();
            // Disparar evento personalizado para que el widget se abra
            window.dispatchEvent(new CustomEvent('open-chatbot'));
          }}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#25D366',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '24px',
            boxShadow: '0 4px 6px rgba(37, 211, 102, 0.2)'
          }}
        >
          <MessageCircle size={20} />
          Pedir por Chatbot Inteligente
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
          <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '500' }}>O ACCESO PERSONAL</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
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
              <a href="#" className="forgot-password" onClick={(e) => { e.preventDefault(); setShowForgotModal(true); }}>
                ¿Olvidaste tu contraseña?
              </a>
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

      {/* Modal de Recuperación de Contraseña */}
      {showForgotModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', padding: '32px', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 className="text-h2" style={{ fontSize: '20px' }}>Recuperar Contraseña</h2>
              <button onClick={resetForgotState} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            
            {forgotStep === 1 && (
              <form onSubmit={handleForgotStep1}>
                <p className="text-muted" style={{ fontSize: '14px', marginBottom: '16px' }}>
                  Ingresa tu correo o usuario para buscar tu pregunta de seguridad.
                </p>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label>Correo o usuario</label>
                  <input 
                    type="text" 
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', marginTop: '8px' }}
                  />
                </div>
                {forgotError && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>{forgotError}</div>}
                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                  {loading ? 'Buscando...' : 'Continuar'}
                </button>
              </form>
            )}

            {forgotStep === 2 && (
              <form onSubmit={handleForgotStep2}>
                <p className="text-muted" style={{ fontSize: '14px', marginBottom: '16px' }}>
                  Responde a la siguiente pregunta de seguridad para confirmar tu identidad.
                </p>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label>Pregunta de Seguridad</label>
                  <div style={{ padding: '12px', backgroundColor: 'rgba(28, 169, 201, 0.1)', color: 'var(--accent-cyan)', borderRadius: '6px', marginTop: '8px', fontWeight: '500' }}>
                    {forgotUser?.pregunta_seguridad}
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label>Tu Respuesta</label>
                  <input 
                    type="text" 
                    value={forgotAnswer}
                    onChange={(e) => setForgotAnswer(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', marginTop: '8px' }}
                  />
                </div>
                {forgotError && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>{forgotError}</div>}
                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  Verificar Respuesta
                </button>
              </form>
            )}

            {forgotStep === 3 && (
              <form onSubmit={handleForgotStep3}>
                <p className="text-muted" style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--accent-green)' }}>
                  ¡Respuesta correcta! Ingresa tu nueva contraseña.
                </p>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label>Nueva Contraseña</label>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', marginTop: '8px' }}
                  />
                </div>
                {forgotError && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>{forgotError}</div>}
                {forgotSuccess && <div style={{ color: 'var(--accent-green)', fontSize: '13px', marginBottom: '16px' }}>{forgotSuccess}</div>}
                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar Nueva Contraseña'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

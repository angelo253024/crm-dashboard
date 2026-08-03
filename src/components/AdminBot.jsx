import React, { useState, useEffect } from 'react';
import { Bot, MessageSquare, Database, Trash2, Plus, Edit } from 'lucide-react';
import { supabase } from '../supabase';

export default function AdminBot() {
  const [activeTab, setActiveTab] = useState('faq');
  const [faqs, setFaqs] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchFaqs();
    fetchHistory();
  }, []);

  const fetchFaqs = async () => {
    const { data } = await supabase.from('bot_respuestas_rapidas').select('*').order('created_at', { ascending: false });
    if (data) setFaqs(data);
  };

  const fetchHistory = async () => {
    const { data } = await supabase.from('bot_historial').select('*').order('created_at', { ascending: false }).limit(50);
    if (data) setHistory(data);
  };

  const handleAddFaq = async () => {
    const keyword = window.prompt("Ingresa la palabra clave (ej. 'ubicacion'):");
    if (!keyword) return;
    const respuesta = window.prompt("Ingresa la respuesta automática:");
    if (!respuesta) return;

    await supabase.from('bot_respuestas_rapidas').insert([{ keyword, respuesta }]);
    fetchFaqs();
  };

  const handleDeleteFaq = async (id) => {
    if (window.confirm("¿Eliminar esta respuesta rápida?")) {
      await supabase.from('bot_respuestas_rapidas').delete().eq('id', id);
      fetchFaqs();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="welcome-section">
        <div>
          <h1 className="text-h1">Administración del Bot 🤖</h1>
          <p className="text-body text-muted" style={{ marginTop: '4px' }}>Configura respuestas rápidas y revisa el historial del Asistente Híbrido.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button 
          onClick={() => setActiveTab('faq')}
          style={{ 
            background: 'none', border: 'none', fontSize: '16px', fontWeight: 'bold', 
            color: activeTab === 'faq' ? 'var(--accent-blue)' : 'var(--text-muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' 
          }}
        >
          <Database size={18} /> Respuestas Rápidas (FAQ)
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          style={{ 
            background: 'none', border: 'none', fontSize: '16px', fontWeight: 'bold', 
            color: activeTab === 'history' ? 'var(--accent-blue)' : 'var(--text-muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' 
          }}
        >
          <MessageSquare size={18} /> Historial de Chats
        </button>
      </div>

      {activeTab === 'faq' && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 className="text-h2">Base de Conocimiento Local</h2>
            <button className="btn-primary" onClick={handleAddFaq}><Plus size={16} /> Nueva Regla</button>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>Palabra Clave (Intención)</th>
                <th style={{ padding: '12px' }}>Respuesta</th>
                <th style={{ padding: '12px', width: '100px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {faqs.map(faq => (
                <tr key={faq.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold', color: 'var(--accent-blue)' }}>{faq.keyword}</td>
                  <td style={{ padding: '12px' }}>{faq.respuesta}</td>
                  <td style={{ padding: '12px' }}>
                    <button onClick={() => handleDeleteFaq(faq.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
              {faqs.length === 0 && <tr><td colSpan="3" style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay respuestas configuradas</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card" style={{ padding: '24px' }}>
          <h2 className="text-h2" style={{ marginBottom: '20px' }}>Últimas 50 interacciones</h2>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>Fecha</th>
                <th style={{ padding: '12px' }}>Usuario</th>
                <th style={{ padding: '12px' }}>Pregunta</th>
                <th style={{ padding: '12px' }}>Origen</th>
                <th style={{ padding: '12px' }}>Tiempo</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px' }}>{new Date(h.created_at).toLocaleString()}</td>
                  <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{h.session_id.substring(0,8)}...</td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{h.pregunta}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ 
                      backgroundColor: h.origen === 'openai' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      color: h.origen === 'openai' ? '#8b5cf6' : '#10b981',
                      padding: '4px 8px', borderRadius: '4px', fontSize: '12px', textTransform: 'capitalize'
                    }}>
                      {h.origen}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{h.tiempo_ms} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

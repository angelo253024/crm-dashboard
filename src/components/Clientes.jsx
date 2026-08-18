import React, { useState, useEffect } from 'react';
import { User, Phone, Car, MapPin, Search, Plus, MessageCircle, Calendar, ShieldCheck, Trash2, X } from 'lucide-react';
import { supabase } from '../supabase';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Modal New Client Form State
  const [newNombre, setNewNombre] = useState('');
  const [newTelefono, setNewTelefono] = useState('');
  const [newVehiculo, setNewVehiculo] = useState('');
  const [newDireccion, setNewDireccion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    setLoading(true);
    let loadedClientes = [];

    // 1. Intentar cargar desde la tabla 'clientes' de Supabase
    try {
      const { data, error } = await supabase.from('clientes').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        loadedClientes = data;
      }
    } catch (err) {
      console.log('Tabla clientes no disponible, extrayendo de reservas...');
    }

    // 2. Extraer o complementar clientes desde la tabla 'reservas' (fallback inteligente)
    try {
      const { data: reservasData } = await supabase.from('reservas').select('*').order('created_at', { ascending: false });
      if (reservasData && reservasData.length > 0) {
        const clientMap = new Map();

        // Primero metemos los que ya cargamos de la tabla clientes
        loadedClientes.forEach(c => {
          const key = c.telefono.replace(/\D/g, '');
          clientMap.set(key, {
            id: c.id,
            nombre: c.nombre,
            telefono: c.telefono,
            vehiculo: c.vehiculo || 'No especificado',
            direccion: c.direccion || 'Sin dirección',
            fecha_registro: c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A',
            total_reservas: 0
          });
        });

        // Complementar con reservas
        reservasData.forEach(r => {
          if (!r.cliente_nombre) return;
          const parts = r.cliente_nombre.split(' - Tel: ');
          const nombre = parts[0] || 'Cliente';
          const telefono = parts[1] || 'S/N';
          const key = telefono.replace(/\D/g, '');

          const vehiculo = r.vehiculo ? r.vehiculo.split(' (Adicionales:')[0] : 'Vehículo';
          const fecha = r.fecha_reserva || (r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A');

          if (clientMap.has(key)) {
            const existing = clientMap.get(key);
            existing.total_reservas = (existing.total_reservas || 0) + 1;
            if (!existing.vehiculo || existing.vehiculo === 'No especificado') existing.vehiculo = vehiculo;
          } else if (key.length >= 7) {
            clientMap.set(key, {
              id: r.id,
              nombre: nombre,
              telefono: telefono,
              vehiculo: vehiculo,
              direccion: r.ubicacion_gps || 'Sin ubicación registrada',
              fecha_registro: fecha,
              total_reservas: 1
            });
          }
        });

        loadedClientes = Array.from(clientMap.values());
      }
    } catch (err) {
      console.error('Error extrayendo clientes de reservas:', err);
    }

    setClientes(loadedClientes);
    setLoading(false);
  };

  const handleCreateCliente = async (e) => {
    e.preventDefault();
    if (!newNombre.trim() || !newTelefono.trim()) {
      alert("Por favor ingresa nombre y teléfono.");
      return;
    }

    setIsSubmitting(true);
    const newClientObj = {
      nombre: newNombre.trim(),
      telefono: newTelefono.trim(),
      vehiculo: newVehiculo.trim() || 'Vehículo',
      direccion: newDireccion.trim() || 'Santa Cruz'
    };

    try {
      const { data, error } = await supabase.from('clientes').insert([newClientObj]).select();
      if (error) {
        console.error("Error insertando cliente en DB:", error);
        alert("Error al guardar cliente en la base de datos: " + error.message);
      } else {
        alert("¡Cliente registrado exitosamente!");
        setShowModal(false);
        setNewNombre('');
        setNewTelefono('');
        setNewVehiculo('');
        setNewDireccion('');
        fetchClientes();
      }
    } catch (err) {
      alert("Error al guardar cliente: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCliente = async (cliente) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al cliente "${cliente.nombre}" (${cliente.telefono})?`)) {
      return;
    }

    try {
      if (cliente.id) {
        await supabase.from('clientes').delete().eq('id', cliente.id);
      }
      if (cliente.telefono) {
        await supabase.from('clientes').delete().eq('telefono', cliente.telefono);
      }

      // También eliminar de localStorage de perfiles guardados
      try {
        const savedStr = localStorage.getItem('lavamovil_saved_clients_v2');
        if (savedStr) {
          const list = JSON.parse(savedStr).filter(c => c.telefono !== cliente.telefono);
          localStorage.setItem('lavamovil_saved_clients_v2', JSON.stringify(list));
        }
      } catch (e) {}

      alert("Cliente eliminado exitosamente.");
      setClientes(prev => prev.filter(c => c.telefono !== cliente.telefono));
    } catch (err) {
      console.error("Error al eliminar cliente:", err);
      alert("Error al eliminar cliente: " + err.message);
    }
  };

  const filteredClientes = clientes.filter(c => 
    c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telefono?.includes(searchTerm) ||
    c.vehiculo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <User style={{ color: 'var(--accent-green)' }} size={28} />
            Clientes y Vehículos Registrados
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Base de datos de clientes, historial de autocompletado y gestión directa por WhatsApp.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setShowModal(true)} 
            className="btn-glass-primary"
            style={{ padding: '10px 18px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={18} /> Registrar Nuevo Cliente
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="service-glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(28, 169, 201, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-green)' }}>
            <User size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Clientes Registrados</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)' }}>{clientes.length}</div>
          </div>
        </div>

        <div className="service-glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
            <Car size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Vehículos en la Plataforma</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)' }}>{clientes.filter(c => c.vehiculo && c.vehiculo !== 'No especificado').length}</div>
          </div>
        </div>

        <div className="service-glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Autocompletado Activo</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)' }}>100% Habilitado</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input 
          type="text"
          placeholder="Buscar por nombre, teléfono o vehículo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '14px', outline: 'none' }}
        />
      </div>

      {/* Table Section */}
      <div className="service-glass-card" style={{ padding: '20px', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando clientes...</div>
        ) : filteredClientes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No se encontraron clientes registrados.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '13px' }}>
                <th style={{ padding: '12px' }}>Cliente</th>
                <th style={{ padding: '12px' }}>Teléfono (WhatsApp)</th>
                <th style={{ padding: '12px' }}>Vehículo Frecuente</th>
                <th style={{ padding: '12px' }}>Dirección / Cobertura</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Servicios</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredClientes.map((cliente, i) => {
                const cleanPhone = cliente.telefono ? cliente.telefono.replace(/\D/g, '') : '';
                const waUrl = `https://wa.me/591${cleanPhone}`;
                return (
                  <tr key={cliente.id || i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 12px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(28,169,201,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-green)', fontWeight: 'bold', fontSize: '13px' }}>
                          {cliente.nombre ? cliente.nombre.charAt(0).toUpperCase() : 'C'}
                        </div>
                        {cliente.nombre}
                      </div>
                    </td>
                    <td style={{ padding: '14px 12px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={14} style={{ color: 'var(--accent-green)' }} />
                        {cliente.telefono}
                      </div>
                    </td>
                    <td style={{ padding: '14px 12px', color: 'var(--text-main)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Car size={14} style={{ color: 'var(--accent-cyan)' }} />
                        {cliente.vehiculo || 'N/A'}
                      </div>
                    </td>
                    <td style={{ padding: '14px 12px', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={14} style={{ color: '#f59e0b' }} />
                        {cliente.direccion || 'Sin ubicación registrada'}
                      </div>
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 'bold', fontSize: '12px' }}>
                        {cliente.total_reservas || 1} pedido(s)
                      </span>
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <a 
                          href={waUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#25D366', color: '#fff', fontSize: '12px', fontWeight: 'bold', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <MessageCircle size={14} /> WhatsApp
                        </a>
                        <button
                          onClick={() => handleDeleteCliente(cliente)}
                          title="Eliminar Cliente"
                          style={{ padding: '6px 10px', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Trash2 size={14} /> Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Agregar Cliente */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="service-glass-card" style={{ padding: '28px', width: '100%', maxWidth: '450px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-main)' }}>Registrar Cliente</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateCliente} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Nombre Completo</label>
                <input type="text" value={newNombre} onChange={(e) => setNewNombre(e.target.value)} required placeholder="Ej. Juan Pérez" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Teléfono (WhatsApp)</label>
                <input type="tel" value={newTelefono} onChange={(e) => setNewTelefono(e.target.value)} required placeholder="Ej. 70012345" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Vehículo (Marca y Modelo)</label>
                <input type="text" value={newVehiculo} onChange={(e) => setNewVehiculo(e.target.value)} placeholder="Ej. Toyota Corolla" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Dirección Frecuente</label>
                <input type="text" value={newDireccion} onChange={(e) => setNewDireccion(e.target.value)} placeholder="Ej. Av. Banzer 4to Anillo" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', outline: 'none' }} />
              </div>

              <button type="submit" disabled={isSubmitting} className="btn-glass-primary" style={{ marginTop: '10px', padding: '12px', justifyContent: 'center', width: '100%' }}>
                {isSubmitting ? 'Guardando...' : 'Guardar Cliente'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

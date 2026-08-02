import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, Droplets } from 'lucide-react';
import { supabase } from '../supabase';

export default function ServiciosCatalog() {
  const [servicios, setServicios] = useState([]);
  const [categorias, setCategorias] = useState(['Todos']);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Forzar el body a un fondo oscuro para el catálogo independientemente del tema de la landing
    document.body.style.backgroundColor = '#121212';
    document.body.style.color = '#ffffff';
    fetchServicios();

    return () => {
      // Limpiar los estilos al salir
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    }
  }, []);

  const fetchServicios = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('servicios').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching servicios:', error);
    } else {
      setServicios(data || []);
      const cats = ['Todos', ...new Set((data || []).map(s => s.categoria).filter(Boolean))];
      setCategorias(cats);
    }
    setLoading(false);
  };

  const filteredServicios = categoriaActiva === 'Todos' 
    ? servicios 
    : servicios.filter(s => s.categoria === categoriaActiva);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#121212', color: '#fff', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
      {/* Navbar Simple */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '64px' }}>
        <Link to="/" style={{ color: '#aaa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#fff'} onMouseOut={(e) => e.target.style.color = '#aaa'}>
          <ArrowLeft size={16} /> Volver
        </Link>
        
        {/* Logo Textual */}
        <div style={{ display: 'flex', alignItems: 'center', fontWeight: 900, fontSize: '20px' }}>
          <span style={{ color: '#1E4C9A' }}>LAVA</span>
          <span style={{ color: '#1CA9C9', margin: '0 2px' }}>M</span>
          <span style={{ color: '#1E4C9A' }}>ÓVIL</span>
        </div>
        
        {/* Placeholder para alinear */}
        <div style={{ width: '80px' }}></div>
      </nav>

      {/* Header del Catálogo */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <Droplets size={32} color="#1CA9C9" />
        </div>
        <h1 style={{ fontSize: '42px', fontWeight: 900, marginBottom: '16px', letterSpacing: '-1px' }}>
          Catálogo de <span style={{ color: '#1CA9C9' }}>Servicios</span>
        </h1>
        <p style={{ color: '#888', fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
          Selecciona el paquete de lavado ideal para tu vehículo. Agendaremos tu servicio a domicilio.
        </p>
      </div>

      {/* Filtro de Categorías */}
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '48px' }}>
        {categorias.map(cat => (
          <button 
            key={cat}
            onClick={() => setCategoriaActiva(cat)}
            style={{
              padding: '8px 20px',
              borderRadius: '30px',
              border: categoriaActiva === cat ? 'none' : '1px solid #333',
              backgroundColor: categoriaActiva === cat ? '#1CA9C9' : 'transparent',
              color: categoriaActiva === cat ? '#fff' : '#aaa',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid de Servicios */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>Cargando catálogo...</div>
      ) : filteredServicios.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No hay servicios disponibles en esta categoría.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
          {filteredServicios.map(servicio => (
            <div 
              key={servicio.id} 
              style={{
                backgroundColor: '#1E1E1E',
                borderRadius: '16px',
                overflow: 'hidden',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                cursor: 'pointer',
                opacity: servicio.disponible !== false ? 1 : 0.6,
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column'
              }}
              onMouseOver={(e) => { if(servicio.disponible !== false) e.currentTarget.style.transform = 'translateY(-4px)' }}
              onMouseOut={(e) => { if(servicio.disponible !== false) e.currentTarget.style.transform = 'translateY(0)' }}
            >
              {/* Imagen del Servicio */}
              <div style={{ height: '220px', backgroundColor: '#2A2A2A', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                {servicio.imagen_url ? (
                  <img src={servicio.imagen_url} alt={servicio.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#555' }}>
                    <ImageIcon size={48} style={{ marginBottom: '8px' }} />
                    <span style={{ fontSize: '12px' }}>IMAGEN DEL SERVICIO</span>
                  </div>
                )}
                
                {/* Badge de Categoría flotante */}
                <div style={{ position: 'absolute', top: '12px', left: '12px', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold', color: '#1CA9C9', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {servicio.categoria}
                </div>
              </div>

              {/* Info del Servicio */}
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#fff' }}>
                  {servicio.nombre}
                </h3>
                
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '16px' }}>
                  <div style={{ color: '#1CA9C9', fontSize: '24px', fontWeight: '800' }}>
                    <span style={{ fontSize: '14px', color: '#aaa', fontWeight: '500', marginRight: '4px' }}>Bs.</span>
                    {servicio.precio}
                  </div>
                  
                  {servicio.disponible !== false ? (
                    <button style={{ backgroundColor: '#1E4C9A', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.target.style.backgroundColor = '#153A7A'} onMouseOut={(e) => e.target.style.backgroundColor = '#1E4C9A'}>
                      Agregar
                    </button>
                  ) : (
                    <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      No Disponible
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

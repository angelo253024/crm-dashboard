import { supabase } from '../../supabase';

/**
 * GeofencingService
 * Arquitectura centralizada (Clean Architecture) para el manejo de zonas de cobertura.
 * Fase 2: Infraestructura lista, operaciones CRUD preparadas.
 */
class GeofencingService {
  /**
   * Obtiene todas las zonas de cobertura desde la base de datos.
   * @param {boolean} soloActivas - Si es true, retorna únicamente las zonas habilitadas.
   */
  async getZonas(soloActivas = false) {
    let query = supabase.from('zonas_cobertura').select('*').order('created_at', { ascending: true });
    
    if (soloActivas) {
      query = query.eq('activa', true);
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('Error obteniendo zonas de cobertura:', error);
      throw error;
    }
    
    return data || [];
  }

  /**
   * Guarda una nueva zona o actualiza una existente.
   * @param {Object} zona - Objeto zona { id, nombre, coordenadas, activa, color, descripcion }
   */
  async saveZona(zona) {
    if (zona.id) {
      // Actualizar existente
      const { data, error } = await supabase
        .from('zonas_cobertura')
        .update({
          nombre: zona.nombre,
          coordenadas: zona.coordenadas,
          activa: zona.activa,
          color: zona.color,
          descripcion: zona.descripcion
        })
        .eq('id', zona.id)
        .select();
        
      if (error) throw error;
      return data[0];
    } else {
      // Crear nueva
      const { data, error } = await supabase
        .from('zonas_cobertura')
        .insert([{
          nombre: zona.nombre,
          coordenadas: zona.coordenadas,
          activa: zona.activa !== undefined ? zona.activa : true,
          color: zona.color || '#1ca9c9',
          descripcion: zona.descripcion
        }])
        .select();
        
      if (error) throw error;
      return data[0];
    }
  }

  /**
   * Elimina una zona por su ID.
   * @param {string} id - UUID de la zona
   */
  async deleteZona(id) {
    const { error } = await supabase
      .from('zonas_cobertura')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    return true;
  }

  /**
   * Activa o desactiva una zona rápidamente.
   * @param {string} id - UUID de la zona
   * @param {boolean} activa - Nuevo estado
   */
  async toggleZonaStatus(id, activa) {
    const { error } = await supabase
      .from('zonas_cobertura')
      .update({ activa })
      .eq('id', id);
      
    if (error) throw error;
    return true;
  }

  /**
   * Verifica si una ubicación (coordenadas GPS lat,lng o texto) está permitida dentro de las zonas activas.
   * @param {string} ubicacion - String con la ubicación (ej: "-17.803982, -63.220555" o dirección)
   * @returns {Promise<boolean>}
   */
  async isLocationAllowed(ubicacion) {
    try {
      if (!ubicacion) return true;

      const zonas = await this.getZonas(true);
      if (!zonas || zonas.length === 0) return true;

      const match = String(ubicacion).match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
      if (!match) {
        return false;
      }

      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);

      const insideAnyZone = zonas.some(zona => {
        const coords = zona.coordenadas;
        if (!Array.isArray(coords) || coords.length < 3) return false;

        let inside = false;
        for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
          const xi = coords[i].lat, yi = coords[i].lng;
          const xj = coords[j].lat, yj = coords[j].lng;

          const intersect = ((yi > lng) !== (yj > lng)) &&
            (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        return inside;
      });

      return insideAnyZone;
    } catch (e) {
      console.error('Error al validar geofencing:', e);
      return true;
    }
  }
}

// Exportamos una única instancia (Singleton) para centralizar la lógica en toda la app
export const geofencingService = new GeofencingService();

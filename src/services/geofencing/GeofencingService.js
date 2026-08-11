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
   * Parsea un string de ubicación ("lat, lng") a un objeto {lat, lng}
   * @param {string} str 
   * @returns {Object|null}
   */
  parseCoords(str) {
    if (!str || typeof str !== 'string') return null;
    const parts = str.split(',');
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    return null;
  }

  /**
   * Ray-casting algorithm para determinar si un punto está dentro de un polígono
   * @param {Object} point - {lat, lng}
   * @param {Array} polygon - [{lat, lng}, ...]
   * @returns {boolean}
   */
  isPointInPolygon(point, polygon) {
    let x = point.lng, y = point.lat;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      let xi = polygon[i].lng, yi = polygon[i].lat;
      let xj = polygon[j].lng, yj = polygon[j].lat;
      
      let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Valida si una ubicación GPS (string) está dentro de alguna de las zonas de cobertura ACTIVAS.
   * Si el string no es una coordenada GPS (es texto manual), retorna true para requerir escrutinio humano.
   * Si no hay zonas activas, permite todo.
   * @param {string} ubicacionGpsStr 
   * @returns {Promise<boolean>}
   */
  async isLocationAllowed(ubicacionGpsStr) {
    const coords = this.parseCoords(ubicacionGpsStr);
    
    // Si no se puede parsear matemáticamente (es texto libre de dirección), no bloqueamos automáticamente.
    // Opcionalmente, se podría forzar siempre el uso del botón GPS, pero por resiliencia se permite.
    if (!coords) return true;

    try {
      const zonasActivas = await this.getZonas(true);
      
      // Si el administrador no ha configurado ninguna zona, permitimos todo por defecto (fail-open)
      if (zonasActivas.length === 0) return true;

      for (const zona of zonasActivas) {
        if (zona.coordenadas && zona.coordenadas.length >= 3) {
          if (this.isPointInPolygon(coords, zona.coordenadas)) {
            return true; // Está dentro de al menos una zona activa
          }
        }
      }
      
      // Si llegamos aquí, la coordenada está fuera de todas las zonas activas
      return false;
    } catch (err) {
      console.error('Error validando cobertura:', err);
      return true; // En caso de fallo crítico de base de datos, no bloqueamos la venta (fail-open)
    }
  }
}

// Exportamos una única instancia (Singleton) para centralizar la lógica en toda la app
export const geofencingService = new GeofencingService();

/**
 * Utilidad para normalizar y generar enlaces limpios de Google Maps y Waze
 * a partir de coordenadas GPS, enlaces previos o direcciones escritas.
 */
export function getMapUrls(locationStr) {
  if (!locationStr) return { googleMapsUrl: null, wazeUrl: null, hasLocation: false };

  const str = String(locationStr).trim();

  // 1. Coordenadas numéricas: ej "-17.7833, -63.1821"
  const coordMatch = str.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if (coordMatch) {
    const coords = `${coordMatch[1]},${coordMatch[2]}`;
    return {
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${coords}`,
      wazeUrl: `https://waze.com/ul?ll=${coords}&navigate=yes`,
      hasLocation: true,
      isCoords: true,
      coords
    };
  }

  // 2. Enlace web directo
  if (/^https?:\/\//i.test(str)) {
    return {
      googleMapsUrl: str,
      wazeUrl: `https://waze.com/ul?q=${encodeURIComponent(str)}&navigate=yes`,
      hasLocation: true,
      isCoords: false
    };
  }

  // 3. Dirección en texto (Santa Cruz de la Sierra)
  const cleanAddr = encodeURIComponent(str.includes('Santa Cruz') ? str : `${str}, Santa Cruz de la Sierra`);
  return {
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${cleanAddr}`,
    wazeUrl: `https://waze.com/ul?q=${cleanAddr}&navigate=yes`,
    hasLocation: true,
    isCoords: false
  };
}

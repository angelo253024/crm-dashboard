export async function autoAssignWorker(supabase, existingTrabajadorId = null) {
  if (existingTrabajadorId) return existingTrabajadorId;
  
  try {
    // 1. Obtener todos los trabajadores que están activos en la plataforma
    const { data: activeWorkers, error } = await supabase
      .from('trabajadores')
      .select('id, nombre, estado, estado_disponibilidad, rol')
      .eq('estado', 'Activo');
      
    if (error || !activeWorkers || activeWorkers.length === 0) {
      return null;
    }

    // Filtrar trabajadores disponibles para recibir servicios
    const availableWorkers = activeWorkers.filter(w => {
      const isTrabajador = !w.rol || w.rol.toLowerCase().includes('trabajador') || w.rol.toLowerCase().includes('lavador');
      const isDisponible = !w.estado_disponibilidad || w.estado_disponibilidad === 'disponible';
      return isTrabajador && isDisponible;
    });

    if (availableWorkers.length === 0) {
      return null;
    }

    // 2. Comprobar qué trabajadores tienen trabajos activos en curso (asignado, en_camino, en_proceso)
    const { data: activeBookings } = await supabase
      .from('reservas')
      .select('trabajador_id')
      .in('estado_reserva', ['asignado', 'en_camino', 'en_proceso'])
      .not('trabajador_id', 'is', null);

    const busyWorkerIds = new Set((activeBookings || []).map(b => b.trabajador_id));

    // Trabajadores completamente libres (sin ningún servicio activo)
    const freeWorkers = availableWorkers.filter(w => !busyWorkerIds.has(w.id));

    if (freeWorkers.length > 0) {
      // Elegir aleatoriamente entre los libres para distribuir equitativamente
      const chosenWorker = freeWorkers[Math.floor(Math.random() * freeWorkers.length)];
      return chosenWorker.id;
    }

    // Si todos tienen algún servicio activo, no forzar asignación: queda pendiente
    return null;
  } catch (err) {
    console.error("Error auto-assigning worker:", err);
    return null;
  }
}


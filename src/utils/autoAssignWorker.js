export async function autoAssignWorker(supabase, existingTrabajadorId = null) {
  if (existingTrabajadorId) return existingTrabajadorId;
  
  try {
    // 1. Obtener todos los trabajadores de la plataforma
    const { data: allWorkers, error } = await supabase
      .from('trabajadores')
      .select('id, nombre, estado, estado_disponibilidad, rol');
      
    if (error || !allWorkers || allWorkers.length === 0) {
      return null;
    }

    // Filtrar trabajadores disponibles para recibir servicios
    const availableWorkers = allWorkers.filter(w => {
      const isTrabajador = !w.rol || w.rol.toLowerCase().includes('trabajador') || w.rol.toLowerCase().includes('lavador');
      // Está disponible si marcó 'disponible' en su panel, o si está 'Activo' sin estar inactivo/ocupado
      const isDisponible = w.estado_disponibilidad === 'disponible' || (w.estado === 'Activo' && (!w.estado_disponibilidad || w.estado_disponibilidad === 'disponible'));
      const notUnavailable = w.estado_disponibilidad !== 'inactivo' && w.estado_disponibilidad !== 'ocupado';
      return isTrabajador && isDisponible && notUnavailable;
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

    // Si todos los trabajadores disponibles tienen algún servicio en proceso, asignar al primer disponible
    return availableWorkers[0]?.id || null;
  } catch (err) {
    console.error("Error auto-assigning worker:", err);
    return null;
  }
}


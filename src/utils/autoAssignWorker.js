export async function autoAssignWorker(supabase, existingTrabajadorId = null) {
  if (existingTrabajadorId) return existingTrabajadorId;
  
  try {
    const { data: activeWorkers, error } = await supabase
      .from('trabajadores')
      .select('id')
      .eq('estado', 'Activo');
      
    if (!error && activeWorkers && activeWorkers.length > 0 && activeWorkers.length <= 2) {
      // Auto-assign to a random active worker if there are 2 or fewer
      const randomWorker = activeWorkers[Math.floor(Math.random() * activeWorkers.length)];
      return randomWorker.id;
    }
  } catch (err) {
    console.error("Error auto-assigning worker:", err);
  }
  
  return existingTrabajadorId || null;
}

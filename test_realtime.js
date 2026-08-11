import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ggxqwudvgjdvskjhyrtz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdneHF3dWR2Z2pkdnNramh5cnR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MzI5MzIsImV4cCI6MjEwMTEwODkzMn0.Xj37pWZPp4qo-NCda6fucxijHhlEmhdFaT08e-U8AF4'

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRealtime() {
  console.log("Subscribing to reservas...");
  
  const channel = supabase.channel('test-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, (payload) => {
      console.log("Realtime event received for reservas!", payload);
    })
    .subscribe((status, err) => {
      console.log("Subscription status for reservas:", status, err || "");
    });
    
  console.log("Subscribing to notificaciones...");
  
  const channel2 = supabase.channel('test-channel-2')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notificaciones' }, (payload) => {
      console.log("Realtime event received for notificaciones!", payload);
    })
    .subscribe((status, err) => {
      console.log("Subscription status for notificaciones:", status, err || "");
    });
    
  // Wait 3 seconds to ensure subscription is active
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log("Inserting test notification...");
  const { data, error } = await supabase.from('notificaciones').insert([{
    mensaje: "Prueba realtime", tipo: "info"
  }]).select();
  console.log("Insert notification result:", error ? error.message : "Success");
  
  console.log("Inserting test reserva...");
  const { data: resData, error: resError } = await supabase.from('reservas').insert([{
    cliente_nombre: "Test Realtime", 
    estado_reserva: "pendiente",
    estado: "Reservado"
  }]).select();
  console.log("Insert reserva result:", resError ? resError.message : "Success");
  
  // Wait for events
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Cleanup test data
  if (data) {
    await supabase.from('notificaciones').delete().eq('id', data[0].id);
  }
  if (resData) {
    await supabase.from('reservas').delete().eq('id', resData[0].id);
  }
  
  console.log("Done.");
  process.exit(0);
}

testRealtime();

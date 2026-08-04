const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const content = fs.readFileSync('./src/supabase.js', 'utf8');
const urlMatch = content.match(/supabaseUrl\s*=\s*['"`](.*?)['"`]/);
const keyMatch = content.match(/supabaseAnonKey\s*=\s*['"`](.*?)['"`]/);
const supabase = createClient(urlMatch[1], keyMatch[1]);
async function test() {
  const { data, error } = await supabase.from('reservas').insert([
      {
        cliente_nombre: 'Prueba - Tel: 1234',
        vehiculo: 'Auto',
        fecha_reserva: '2026-08-04',
        hora_reserva: '12:00:00',
        servicio_id: 1, // Need to make sure this is a valid ID or it might fail foreign key
        precio_total: 50,
        estado: 'Reservado',
        trabajador_id: null,
        estado_reserva: 'pendiente'
      }
    ]);
  console.log('Insert Error:', error);
}
test();

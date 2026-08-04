import { createClient } from '@supabase/supabase-js'

// Need to read env vars from .env
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function test() {
  const { data, error } = await supabase.from('reservas').select('*, servicios(nombre)').limit(2)
  console.log(JSON.stringify({data, error}, null, 2))
}
test()

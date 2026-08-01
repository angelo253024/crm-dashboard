import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ggxqwudvgjdvskjhyrtz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdneHF3dWR2Z2pkdnNramh5cnR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MzI5MzIsImV4cCI6MjEwMTEwODkzMn0.Xj37pWZPp4qo-NCda6fucxijHhlEmhdFaT08e-U8AF4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

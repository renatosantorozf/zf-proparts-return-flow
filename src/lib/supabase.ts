import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Chaves cravadas direto no código para ignorar problemas de cache do Cloudflare
const supabaseUrl: string = 'https://bklyhayqtnydxxvlgthk.supabase.co'
const supabaseAnonKey: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrbHloYXlxdG55ZHh4dmxndGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MzE3NjksImV4cCI6MjA5ODAwNzc2OX0.Y1V3zKu2RpMVrnKeht2S2j5TzHYOh9OVOlWdGLsarhs'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }
})

export async function checkConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('sla_config').select('id').limit(1)
    return !error
  } catch {
    return false
  }
}

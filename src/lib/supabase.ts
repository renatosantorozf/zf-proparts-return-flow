import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis de ambiente Supabase não configuradas.\n' +
    'Copie .env.example para .env.local e preencha as credenciais.'
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }
})

// Helper: verifica conectividade com o Supabase
export async function checkConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('sla_config').select('id').limit(1)
    return !error
  } catch {
    return false
  }
}

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Vite injeta VITE_* em import.meta.env no build
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const meta = import.meta as any
const supabaseUrl: string = meta.env?.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey: string = meta.env?.VITE_SUPABASE_ANON_KEY ?? ''

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

export async function checkConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('sla_config').select('id').limit(1)
    return !error
  } catch {
    return false
  }
}

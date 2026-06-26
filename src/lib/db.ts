import { createClient } from '@supabase/supabase-js'

// Cliente Supabase sem tipagem genérica
// Usado em todas as operações de insert/update/upsert para evitar never[]
// O cliente tipado (supabase.ts) é usado apenas para leitura onde o tipo é inferido corretamente
const url = 'https://bklyhayqtnydxxvlgthk.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrbHloYXlxdG55ZHh4dmxndGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MzE3NjksImV4cCI6MjA5ODAwNzc2OX0.Y1V3zKu2RpMVrnKeht2S2j5TzHYOh9OVOlWdGLsarhs'

export const db = createClient(url, key)

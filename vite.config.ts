import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: '/', 
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
  // Substitui as variáveis diretamente no código final durante o build:
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://bklyhayqtnydxxvlgthk.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrbHloYXlxdG55ZHh4dmxndGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MzE3NjksImV4cCI6MjA5ODAwNzc2OX0.Y1V3zKu2RpMVrnKeht2S2j5TzHYOh9OVOlWdGLsarhs')
  }
})

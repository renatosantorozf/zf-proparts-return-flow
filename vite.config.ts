import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: '/', // ◄ ADICIONE ESTA LINHA: Garante que os assets sejam buscados a partir da raiz do domínio
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
  // SPA: garante que rotas do React Router funcionam em dev
  server: {
    port: 5173,
  },
})

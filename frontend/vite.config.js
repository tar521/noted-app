import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Add allowedHosts here to fix the "Host not allowed" error
    // This forces Vite to use 127.0.0.1 instead of [::1]
    host: '127.0.0.1',
    allowedHosts: ['notes-app', 'localhost', '127.0.0.1'],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})
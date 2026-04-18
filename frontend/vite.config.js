import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
  server: {
    port: 5173,
    // Add allowedHosts here to fix the "Host not allowed" error
    // This forces Vite to use 127.0.0.1 instead of [::1]
    host: '0.0.0.0', // Listen on all network interfaces
    allowedHosts: ['notes-app', 'localhost', '127.0.0.1', '10.238.137.13', '10.238.137.13.sslip.io'],
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://backend:3001',
        changeOrigin: true,
      }
    }
  }
})
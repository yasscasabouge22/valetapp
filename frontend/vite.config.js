import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // Important pour SSE / EventSource
        ws: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Désactiver la compression pour SSE
            proxyReq.setHeader('Accept-Encoding', 'identity');
          });
        },
      }
    }
  },
  build: {
    outDir: '../backend/public',
    emptyOutDir: true,
  }
})

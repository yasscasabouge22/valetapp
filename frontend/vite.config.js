import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  define: {
    __API_URL__: JSON.stringify("https://valetapp-production.up.railway.app")
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        ws: false,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("Accept-Encoding", "identity");
          });
        },
      }
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  }
})

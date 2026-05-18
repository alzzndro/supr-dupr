import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'https://api.dupr.gg',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, _req, _res) => {
            // Remove the browser-inserted Origin and Referer headers completely!
            // This tricks Spring Boot into treating the proxied call as a direct server-to-server request
            // rather than a CORS request, completely bypassing the CORS filter!
            proxyReq.removeHeader('Origin');
            proxyReq.removeHeader('Referer');
          });
        }
      }
    }
  },
})

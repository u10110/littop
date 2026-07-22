import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '127.0.0.1', // Exposes the server to the local network
    port: 5413 ,      // Optional: specify your preferred port,
    allowedHosts: ['littop.ru'],
    proxy: {
      // Intercepts all requests starting with /api
      '/api': {
        target: 'http://localhost:4004', // Your backend API address
        changeOrigin: true,             // Changes the origin of the host header to the target URL
        //rewrite: (path) => path.replace(/^\/api/, ''), // Removes /api from the final request
      },
    },
  },
})

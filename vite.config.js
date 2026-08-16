import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '127.0.0.1', // Exposes the server to the local network
    port: 5413 ,      // Optional: specify your preferred port,
    allowedHosts: ['littop.ru,pre-prod.littop.ru'],
    proxy: {
      // Shorthand for simple forwarding
      '/api':{
        target: 'https://pre-prod.littop.ru', // Your backend port
        changeOrigin: true,             // Changes origin header to target URL
        secure: false,                  // Set to true if backend uses self-signed SSL
        ws: true,                       // Enable websocket proxying
      }
    },
  },
})

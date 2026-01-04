import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: [
      'temporary-website-trycloudflare.com'
    ],
    proxy: {
      '/api': {
        //target: 'http://localhost:5000',
        target: 'http://10.128.90.61:5000',
        changeOrigin: true,
        ws: true,
      },
      '/socket.io': {
        //target: 'http://localhost:5000',
        target: 'http://10.128.90.61:5000',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        //target: 'http://localhost:5000',
        target: 'http://10.128.90.61:5000',
        changeOrigin: true,
      },
    },
  }
})

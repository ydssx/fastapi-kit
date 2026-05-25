import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiProxyTarget = process.env.VITE_API_PROXY ?? 'https://localhost'

export default defineConfig({
  plugins: [react()],
  base: '/creator/',
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

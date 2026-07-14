import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const apiProxyTarget = process.env.VITE_API_PROXY ?? 'https://localhost'

export default defineConfig({
  plugins: [react()],
  base: '/creator/',
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})

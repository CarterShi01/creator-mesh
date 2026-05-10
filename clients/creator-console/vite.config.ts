import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      injectRegister: 'auto',
      manifest: false, // we use our own manifest.webmanifest in public/
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        runtimeCaching: [], // no API caching — mock UI only
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false, // disable in dev to avoid confusion
      },
    }),
  ],
  base: './',
})

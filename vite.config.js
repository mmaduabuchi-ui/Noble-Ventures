import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Automatically update service worker
      includeAssets: [
        'favicon.svg',
        'favicon.ico',
        'robots.txt',
        'apple-touch-icon.png'
      ],
      manifest: {
        name: 'Noble Ventures App',
        short_name: 'NobleVentures',
        description: 'Track products, sales, and monthly audits.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        form_factor: 'wide', // added for richer PWA install UI
        icons: [
          {
            src: '/resized-image-192x192.png', // updated to match actual file
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/resized-image-512x512.png', // updated to match actual file
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      }
    })
  ]
})
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      /*
       * We use our own service worker at:
       * frontend/public/sw.js
       *
       * It contains the push notification and
       * notification click handlers.
       */
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',

      /*
       * main.jsx registers /sw.js manually.
       * Do not let the plugin register it a second time.
       */
      injectRegister: false,

      /*
       * Our custom sw.js does not use:
       * self.__WB_MANIFEST
       *
       * Therefore, disable Workbox precache-manifest
       * injection to avoid a production build error.
       */
      injectManifest: {
        injectionPoint: undefined,
        rollupFormat: 'iife'
      },

      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-512x512.png'
      ],

      manifest: {
        id: '/',
        name: 'Essential Supermarket Inventory',
        short_name: 'Essential',

        description:
          'A web-based supermarket inventory management system with real-time stock monitoring and automated low-stock alerts.',

        theme_color: '#16a34a',
        background_color: '#f2fff8',

        display: 'standalone',
        start_url: '/',
        scope: '/',

        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },

      /*
       * Allows PWA behavior while using:
       * npm run dev
       *
       * Production deployment still uses the generated
       * build service worker.
       */
      devOptions: {
        enabled: true,
        type: 'classic'
      }
    })
  ],

  server: {
    port: 5173,
    host: true
  }
});
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
       * notification click handlers, plus app-shell caching.
       */
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',

      /*
       * main.jsx registers /sw.js manually.
       * Do not let the plugin register it a second time.
       */
      injectRegister: false,

      injectManifest: {
        injectionPoint: 'self.__WB_MANIFEST',
        rollupFormat: 'iife',
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
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
       * Offline behavior is tested with the production build
       * (npm run build && npm run preview), not the dev server.
       */
      devOptions: {
        enabled: false
      }
    })
  ],

  server: {
    port: 5173,
    host: true
  }
});
VitePWA({
  registerType: 'autoUpdate',

  strategies: 'injectManifest',
  srcDir: 'public',
  filename: 'sw.js',

  injectManifest: {
    injectionPoint: undefined
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
      'Supermarket inventory management with real-time stock monitoring and automated alerts.',
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
  }
})
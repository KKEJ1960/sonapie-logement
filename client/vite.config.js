import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

export default defineConfig({
  plugins: [
    react(),
    // Compresse les images statiques (client/public + src/assets) au build.
    // N'affecte jamais les photos Cloudinary, qui ne transitent pas par ce build.
    ViteImageOptimizer({
      includePublic: true,
      png: { compressionLevel: 9 }, // sans perte (palette non activée)
      jpg: { quality: 80 },
      jpeg: { quality: 80 },
      webp: { quality: 80 }, // s'applique aux .webp déjà présents dans le projet
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'logo-sonapie-512.png'],
      manifest: {
        name: 'SONAPIE — Gestion des Logements',
        short_name: 'SONAPIE',
        description: "Système de gestion numérique des logements administratifs de l'État",
        theme_color: '#E8520A',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'logo-sonapie-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'logo-sonapie-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'logo-sonapie-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'logo-sonapie-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        categories: ['productivity', 'utilities'],
        lang: 'fr',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Grandes illustrations décoratives (LoginPage) : pas critiques pour l'app-shell
        // hors-ligne, on évite de gonfler le précache initial avec plusieurs Mo chacune.
        globIgnores: ['**/salon.png', '**/immeuble.png', '**/hero-immeuble.webp'],
        runtimeCaching: [
          {
            // Appels à l'API (même origine, chemin relatif /api/... via le proxy Vite en dev)
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            method: 'GET',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }, // 24h
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Images des logements/documents hébergées sur Cloudinary
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cloudinary-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30j
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: true, // Active le service worker en dev pour pouvoir le tester
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    assetsInlineLimit: 4096, // inline en base64 les tout petits fichiers (< 4 Ko)
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          charts: ['recharts'],
          motion: ['framer-motion'],
          icons:  ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    minify: 'esbuild',
  },
})

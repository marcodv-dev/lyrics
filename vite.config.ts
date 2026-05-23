import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Lyrics PWA',
          short_name: 'Lyrics',
          description: 'Cerca e salva testi delle canzoni',
          theme_color: '#1E1B4B',
          background_color: '#1E1B4B',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
      }),
    ],
    server: {
      proxy: {
        '/api/genius': {
          target: 'https://api.genius.com',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api\/genius/, ''),
          headers: {
            Authorization: `Bearer ${env.VITE_GENIUS_TOKEN}`,
          },
        },
      },
    },
  }
})

import type { MetadataRoute } from 'next'
import { APP_NAME } from '@/lib/config'

// Installable-PWA manifest (no service worker in v1 — D-005). Colors are the
// placeholder palette; the M5 design pass re-points them with the real tokens.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: 'Maple',
    description: 'The household companion for Jake, Kayla & Maple.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fbf7f1',
    theme_color: '#c9702e',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}

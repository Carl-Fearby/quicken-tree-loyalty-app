import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'The Quicken Tree',
    short_name: 'Quicken Tree',
    description: 'Book, earn rewards and order ahead at The Quicken Tree.',
    start_url: '/',
    scope: '/',
    // Prefer the edge-to-edge app surface; browsers that do not support it
    // fall back through the standard manifest display-mode chain.
    display: 'fullscreen',
    background_color: '#f7f7f7',
    theme_color: '#cf122d',
    icons: [
      { src: '/pwa/quicken-tree-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa/quicken-tree-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}

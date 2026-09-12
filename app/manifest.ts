import type { MetadataRoute } from 'next';
import {designTokens} from './designTokens';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'The Quicken Tree',
    short_name: 'Quicken Tree',
    description: 'Book, earn rewards and order ahead at The Quicken Tree.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: designTokens.appSurface,
    theme_color: designTokens.brand,
    icons: [
      { src: '/pwa/quicken-tree-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa/quicken-tree-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}

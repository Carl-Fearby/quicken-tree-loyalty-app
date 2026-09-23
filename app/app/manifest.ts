import type { MetadataRoute } from 'next';
import {designTokens} from './designTokens';
import {tenantBrand} from './lib/tenant-brand';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pace Venues',
    short_name: 'Pace',
    description: `Book, earn rewards and order ahead at ${tenantBrand.name}.`,
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

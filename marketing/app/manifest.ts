import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pace — Restaurant management software',
    short_name: 'Pace',
    description: 'Restaurant management software for bookings, menus, customer loyalty and a companion guest app.',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf9f6',
    theme_color: '#152c37',
    lang: 'en-GB',
    icons: [{src: '/favicon.png', sizes: '1254x1254', type: 'image/png', purpose: 'any'}],
  };
}

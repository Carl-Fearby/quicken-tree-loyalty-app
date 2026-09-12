import type { Metadata, Viewport } from 'next';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './globals.css';
import {designTokens} from './designTokens';

export const metadata: Metadata = {
  title: 'The Quicken Tree | Loyalty',
  description: 'Book, earn and enjoy more at The Quicken Tree.',
  applicationName: 'The Quicken Tree',
  manifest: '/manifest.webmanifest',
  // In iOS standalone mode this lets the app surface continue behind the
  // system status area. Content itself is padded with safe-area insets.
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'The Quicken Tree' },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/pwa/quicken-tree-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/pwa/quicken-tree-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/pwa/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = { themeColor: designTokens.brand, viewportFit: 'cover' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

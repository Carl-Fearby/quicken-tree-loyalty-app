import type { Metadata } from 'next';
import { siteUrl, indexable, jsonLd, description } from '../lib/seo';
import './globals.css';
import './a11y.css';
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl ?? 'http://localhost:4300'),
  title: 'Pace | Restaurant management software for better service',
  description,
  applicationName: 'Pace',
  category: 'business',
  creator: 'Pace',
  publisher: 'Pace',
  keywords: ['restaurant management software', 'restaurant booking software', 'table management', 'restaurant menu management', 'hospitality software', 'restaurant loyalty software', 'guest app'],
  formatDetection: {email: false, address: false, telephone: false},
  icons: {
    icon: [{url: '/favicon.png', type: 'image/png'}],
    shortcut: ['/favicon.png'],
    apple: [{url: '/favicon.png'}],
  },
  robots: { index: indexable, follow: indexable, googleBot: { index: indexable, follow: indexable, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  const schema = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', name: 'Pace', slogan: 'Service in Sync', ...(siteUrl ? { '@id': `${siteUrl}/#organization`, url: siteUrl, logo: `${siteUrl}/favicon.png`, image: `${siteUrl}/favicon.png` } : {}) },
    { '@type': 'WebSite', name: 'Pace', inLanguage: 'en-GB', description, ...(siteUrl ? { '@id': `${siteUrl}/#website`, url: siteUrl, publisher: { '@id': `${siteUrl}/#organization` } } : {}) },
    { '@type': 'SoftwareApplication', name: 'Pace', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', description, featureList: ['Restaurant booking diary', 'Table management', 'Menu maintenance', 'Customer loyalty points', 'Kitchen closing times', 'Companion guest app'], offers: [{ '@type': 'Offer', price: '59', priceCurrency: 'GBP', description: 'Pace Core standard monthly price per venue, excluding VAT' }], ...(siteUrl ? { url: siteUrl, publisher: { '@id': `${siteUrl}/#organization` } } : {}) },
  ] };
  return <html lang="en-GB"><body><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(schema)}}/>{children}</body></html>;
}

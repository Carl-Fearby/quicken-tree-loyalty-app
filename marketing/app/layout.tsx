import type { Metadata } from 'next';
import { siteUrl, indexable, jsonLd, description } from '../lib/seo';
import ScrollToTop from './ScrollToTop';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl ?? 'http://localhost:4300'),
  applicationName: 'Pace',
  robots: { index: indexable, follow: indexable, googleBot: { index: indexable, follow: indexable, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  const schema = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', name: 'Pace', slogan: 'Service in Sync', ...(siteUrl ? { '@id': `${siteUrl}/#organization`, url: siteUrl } : {}) },
    { '@type': 'WebSite', name: 'Pace', inLanguage: 'en-GB', description, ...(siteUrl ? { '@id': `${siteUrl}/#website`, url: siteUrl, publisher: { '@id': `${siteUrl}/#organization` } } : {}) },
    { '@type': 'SoftwareApplication', name: 'Pace', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', description, featureList: ['Restaurant booking diary', 'Table management', 'Menu maintenance', 'Customer loyalty points', 'Kitchen closing times'], ...(siteUrl ? { url: siteUrl, publisher: { '@id': `${siteUrl}/#organization` } } : {}) },
  ] };
  return <html lang="en-GB"><body><ScrollToTop/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(schema)}}/>{children}</body></html>;
}

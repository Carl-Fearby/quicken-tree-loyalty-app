import type { Metadata } from 'next';
const configured = process.env.SITE_URL;
export const siteUrl = configured ? new URL(configured).origin : undefined;
export const indexable = Boolean(siteUrl) && process.env.SITE_NOINDEX !== 'true';
export const description = 'Restaurant management software for bookings, table assignments, menus and customer loyalty. Bring your hospitality team together with Pace.';
export function metadata(title: string, summary: string, path: string): Metadata {
  return {
    title, description: summary, authors: [{name: 'Pace'}],
    ...(siteUrl ? { alternates: { canonical: new URL(path, siteUrl).href } } : {}),
    openGraph: { title, description: summary, type: 'website', locale: 'en_GB', siteName: 'Pace', ...(siteUrl ? { url: new URL(path, siteUrl).href } : {}), images: [{ url: '/opengraph-image.svg', width: 1200, height: 630, alt: 'Pace — Restaurant management software. Service in Sync.' }] },
    twitter: { card: 'summary_large_image', title, description: summary, images: ['/opengraph-image.svg'] },
  };
}
export function jsonLd(value: unknown) { return JSON.stringify(value).replace(/</g, '\\u003c'); }

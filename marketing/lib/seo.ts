import type { Metadata } from 'next';
const configured = process.env.SITE_URL;
export const siteUrl = configured ? new URL(configured).origin : undefined;
export const indexable = Boolean(siteUrl) && process.env.SITE_NOINDEX !== 'true';
export const description = 'Restaurant management software for bookings, table assignments, menus and customer loyalty. Bring your hospitality team together with Pace.';
export const pageUrl = (path: string) => siteUrl ? new URL(path === '/' ? '/' : `${path.replace(/\/$/, '')}/`, siteUrl).href : undefined;
export function metadata(title: string, summary: string, path: string): Metadata {
  const canonical = pageUrl(path);
  return {
    title, description: summary, authors: [{name: 'Pace'}],
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: { title, description: summary, type: 'website', locale: 'en_GB', siteName: 'Pace', ...(canonical ? { url: canonical } : {}), images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'Pace restaurant management software' }] },
    twitter: { card: 'summary_large_image', title, description: summary, images: ['/opengraph-image.png'] },
  };
}
export function jsonLd(value: unknown) { return JSON.stringify(value).replace(/</g, '\\u003c'); }

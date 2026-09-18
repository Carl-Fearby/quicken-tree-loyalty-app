import type { MetadataRoute } from 'next';
import { indexable, siteUrl } from '../lib/seo';
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', ...(indexable ? { allow: '/' } : { disallow: '/' }) }, ...(indexable && siteUrl ? { sitemap: `${siteUrl}/sitemap.xml` } : {}) };
}

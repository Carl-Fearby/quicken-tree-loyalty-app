import type { MetadataRoute } from 'next';
import { features } from '../lib/features';
import { siteUrl, indexable } from '../lib/seo';
export default function sitemap(): MetadataRoute.Sitemap {
  if(!siteUrl || !indexable) return [];
  return ['/', '/platform', '/platform-overview', '/platform-map', '/operations-centre', '/workflow-examples', '/capabilities', '/app', '/guest-app-back-office', '/pricing', '/business-case', '/about', '/integrations', '/use-cases', '/resources', '/getting-started', '/booking-operations', '/menu-management-guide', '/loyalty-guide', '/launch-checklist', '/venue-growth', '/comparison', '/support', '/production-readiness', '/restaurants', '/cafes', '/pubs-bars', '/customer-journey', '/for-venue-owners', '/implementation', '/product-tour', '/developers', '/security', '/how-it-works', '/faqs', '/contact', '/privacy', '/cookies', '/terms', ...features.map(f=>`/features/${f.slug}`)].map(path=>({url:new URL(path,siteUrl).href}));
}

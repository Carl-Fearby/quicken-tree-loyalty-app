import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingPage } from '../MarketingPage';
import { metadata } from '../../lib/seo';

export const generateMetadata = (): Metadata => metadata('Pace platform map', 'See how the Pace guest app, back office, operational data and planned integrations connect.', '/platform-map');

const layers = [
  ['Guest experience', 'Booking, menus, upcoming visits, profile preferences and loyalty moments.', '/app'],
  ['Venue back office', 'Booking diary, table assignment, hours, menu maintenance, rewards and settings.', '/product-tour'],
  ['Operational data', 'Venue configuration, availability, bookings, menu content and customer reward records.', '/security'],
  ['Connected services', 'A practical path for future API access and integrations, with scope agreed around the venue.', '/developers'],
];

export default function PlatformMapPage() {
  return <MarketingPage eyebrow="PLATFORM MAP" title={<>A joined-up view from guest to <em>service.</em></>} intro="Pace connects the parts of a venue operation that need to stay in sync. This is the product shape today, alongside the integration path being developed.">
    <div className="resource-grid">{layers.map(([title, copy, href], index) => <article key={title}><span>0{index + 1}</span><h2>{title}</h2><p>{copy}</p><Link href={href}>Explore this layer <span>↗</span></Link></article>)}</div>
    <section className="resource-callout"><p className="eyebrow">HOW TO READ THIS</p><h2>The platform is a set of connected responsibilities.</h2><p>The guest experience depends on accurate operational content. The team’s tools depend on clear rules. Integrations should extend that foundation rather than add another disconnected source of truth.</p><Link className="button" href="/contact">Talk through your setup <span>↗</span></Link></section>
  </MarketingPage>;
}

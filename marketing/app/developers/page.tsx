import type { Metadata } from 'next';
import { MarketingPage } from '../MarketingPage';

export const metadata: Metadata = {
  title: 'Developers | Pace',
  description: 'Learn about the planned Pace API and request integration documentation.',
};

export default function DevelopersPage() {
  return <MarketingPage eyebrow="DEVELOPERS" title={<>Connect Pace to the way your team works. <em>Coming soon.</em></>} intro="We are building an API for teams that want to connect Pace with the tools and workflows around their venue.">
    <div className="platform-cards">
      <article><span>01</span><h2>One connected API</h2><p>Our planned API will provide a consistent way to work with key Pace areas, including bookings, menus, service settings and customer rewards.</p></article>
      <article><span>02</span><h2>Built for integrations</h2><p>Connect Pace with the operational tools your team already uses, with access designed around reliable, practical hospitality workflows.</p></article>
      <article><span>03</span><h2>Documentation on request</h2><p>API access and public documentation are not available yet. Contact us to discuss your use case and request the current integration outline.</p></article>
    </div>
  </MarketingPage>;
}

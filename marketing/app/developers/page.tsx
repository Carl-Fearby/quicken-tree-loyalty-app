import type { Metadata } from 'next';
import { MarketingPage } from '../MarketingPage';

export const metadata: Metadata = {
  title: 'Developers | Pace',
  description: 'Learn how the current Pace API supports integrations and request implementation documentation.',
};

export default function DevelopersPage() {
  return <MarketingPage eyebrow="DEVELOPERS" title={<>Connect Pace to the way your team works. <em>Available now.</em></>} intro="The Pace API supports key operational workflows today for teams that want to connect Pace with other tools around their venue.">
    <div className="platform-cards">
      <article><span>01</span><h2>One connected API</h2><p>The current API covers key Pace areas, including bookings, content datasets, member profiles and customer rewards.</p></article>
      <article><span>02</span><h2>Built for integrations</h2><p>Connect Pace with the operational tools your team already uses, with access designed around reliable, practical hospitality workflows.</p></article>
      <article><span>03</span><h2>Documentation and access</h2><p>OpenAPI documentation is available for implementation projects. Contact us to discuss your use case and enable API access for your venue.</p></article>
    </div>
  </MarketingPage>;
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingPage } from '../MarketingPage';
import { metadata } from '../../lib/seo';

export const generateMetadata = (): Metadata => metadata('Hospitality operations centre | Pace', 'Practical guides and platform information for hospitality operators planning clearer service workflows.', '/operations-centre');

const links = [
  ['/platform-overview', 'Platform overview', 'See how the guest experience, back office and data layer fit together.'],
  ['/getting-started', 'Getting started', 'Choose a first phase and prepare the information your team needs.'],
  ['/booking-operations', 'Booking operations', 'Make the diary, table assignments and service rules easier to trust.'],
  ['/menu-management-guide', 'Menu management', 'Keep prices, availability and dietary information current.'],
  ['/loyalty-guide', 'Loyalty advice', 'Design rewards that feel worthwhile without creating more admin.'],
  ['/launch-checklist', 'Launch checklist', 'Prepare the venue, team and guest journey for a live rollout.'],
  ['/business-case', 'Build the business case', 'Assess the operational value before committing to a wider rollout.'],
  ['/comparison', 'Buyer guide', 'Compare workflows, implementation, support and future integrations.'],
];

export default function OperationsCentrePage() {
  return <MarketingPage eyebrow="OPERATIONS CENTRE" title={<>Useful answers for better <em>service.</em></>} intro="A practical library for venue owners, operators and teams deciding how to improve the working day. Start with the question closest to the problem you are trying to solve.">
    <div className="resource-grid">{links.map(([href, title, copy]) => <article key={href}><h2>{title}</h2><p>{copy}</p><Link href={href}>Explore the guide <span>↗</span></Link></article>)}</div>
  </MarketingPage>;
}

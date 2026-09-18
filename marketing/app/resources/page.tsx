import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingPage } from '../MarketingPage';
import { metadata } from '../../lib/seo';

export const generateMetadata = (): Metadata =>
  metadata('Resources | Pace', 'Practical guides for hospitality teams planning bookings, menus, rewards and service operations.', '/resources');

const resources = [
  ['OPERATIONS GUIDE', 'The venue setup checklist', 'A practical checklist for tables, capacities, opening hours, kitchen closing times, booking durations and staff access.', '/implementation'],
  ['STARTING GUIDE', 'Getting started with Pace', 'How to choose a first phase, prepare the essentials and build a rollout around the team’s real workflow.', '/getting-started'],
  ['BOOKINGS GUIDE', 'A calmer booking diary', 'What to review before service, how to keep table assignments clear and which booking details are useful to the team.', '/features/restaurant-booking-software'],
  ['BOOKINGS GUIDE', 'Booking operations that scale', 'Practical advice for diary ownership, table assignment, service rules and a more trustworthy booking process.', '/booking-operations'],
  ['MENU GUIDE', 'Keeping service information current', 'A simple way to organise sections, dishes, prices, availability and dietary information as the menu changes.', '/features/restaurant-menu-management'],
  ['MENU GUIDE', 'A practical menu management guide', 'How to keep guest-facing menu information accurate from the kitchen through to the app.', '/menu-management-guide'],
  ['LOYALTY GUIDE', 'Designing a thoughtful reward', 'How to choose a clear points value, expiry date and reason for a reward without creating another manual process.', '/features/restaurant-loyalty-rewards'],
  ['LOYALTY GUIDE', 'Making repeat visits worthwhile', 'A grounded approach to QR rewards, points, expiry dates and staff-managed exceptions.', '/loyalty-guide'],
  ['INTEGRATION BRIEF', 'Planning a connected operation', 'Questions to ask when deciding which booking, menu, loyalty and operational workflows should connect first.', '/integrations'],
  ['BUYER GUIDE', 'Questions to ask before choosing hospitality software', 'A grounded checklist for comparing workflows, implementation, support, data handling and future integrations.', '/comparison'],
  ['GROWTH GUIDE', 'Building an operation before scaling it', 'How to create repeatable workflows across venues without forcing every location into the same service model.', '/venue-growth'],
  ['LAUNCH CHECKLIST', 'Prepare a venue for launch', 'A practical checklist for venue basics, tables, menus, guest journeys, team readiness and the first-week review.', '/launch-checklist'],
];

export default function ResourcesPage() {
  return <MarketingPage eyebrow="RESOURCES" title={<>Useful thinking for the people who make hospitality <em>happen.</em></>} intro="Practical starting points for venue owners, operators and teams deciding how to make the working day clearer.">
    <div className="resource-grid">{resources.map(([type, title, copy, href]) => <article key={title}><span>{type}</span><h2>{title}</h2><p>{copy}</p><Link href={href}>Read the guide <span>↗</span></Link></article>)}</div>
    <section className="resource-callout"><p className="eyebrow">WANT A PRODUCT WALKTHROUGH?</p><h2>Turn the questions into a conversation.</h2><p>Book a demo or discuss a focused pilot around the part of service you want to improve first.</p><Link className="button" href="/contact">Book a demo <span>↗</span></Link></section>
  </MarketingPage>;
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingPage } from '../MarketingPage';
import { metadata } from '../../lib/seo';

export const generateMetadata = (): Metadata =>
  metadata('Use Cases | Pace', 'See how Pace helps hospitality teams reduce admin, keep service information current and build repeat visits.', '/use-cases');

const useCases = [
  ['01', 'Reduce booking admin', 'Give the team one visual view of reservations, guest counts, table capacities and assignments, so service planning is easier to scan and maintain.', '/features/restaurant-booking-software'],
  ['02', 'Keep menus current', 'Organise service menus, sections and dishes in one place, with prices, availability and dietary information close to the details staff need.', '/features/restaurant-menu-management'],
  ['03', 'Coordinate service rules', 'Set venue hours, kitchen closing times, booking durations and table capacities around the way each venue actually operates.', '/platform'],
  ['04', 'Build repeat visits', 'Create trackable rewards, set expiry dates, credit customer points with a reason and keep the history visible to the team.', '/features/restaurant-loyalty-rewards'],
  ['05', 'Connect the guest journey', 'Give customers a clearer path from choosing a time to reviewing a booking, browsing the menu and finding their upcoming visits.', '/app'],
  ['06', 'Create a rollout path', 'Start with the workflow creating the most friction, then add menus, rewards and guest-facing experiences as the operation is ready.', '/implementation'],
];

export default function UseCasesPage() {
  return <MarketingPage eyebrow="USE CASES" title={<>Solve the parts of service that create the most <em>friction.</em></>} intro="Pace brings practical hospitality workflows together, so teams can improve one important part of the working day without losing sight of the wider guest journey.">
    <div className="resource-grid">{useCases.map(([number, title, copy, href]) => <article key={title}><span>{number}</span><h2>{title}</h2><p>{copy}</p><Link href={href}>Explore this use case <span>↗</span></Link></article>)}</div>
    <section className="resource-callout"><p className="eyebrow">NOT SURE WHERE TO START?</p><h2>Bring us the workflow that is slowing the team down.</h2><p>We can map the current process against Pace and suggest a focused first phase.</p><Link className="button" href="/contact">Talk through your workflow <span>↗</span></Link></section>
  </MarketingPage>;
}

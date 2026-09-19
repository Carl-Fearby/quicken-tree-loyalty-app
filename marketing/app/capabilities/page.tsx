import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter, SiteHeader } from '../SiteChrome';
import { ArrowIcon } from '../WhatsAppLink';
import { metadata } from '../../lib/seo';

export const generateMetadata = (): Metadata => metadata('Capabilities | Pace', 'See what Pace restaurant management software does for bookings, menus, service hours and customer loyalty.', '/capabilities');

const capabilities = [
  ['01', 'Plan every service', 'Manage reservations in a visual diary, see guest numbers at a glance, configure table capacities and assign tables that fit each booking.'],
  ['02', 'Control the details', 'Set venue and kitchen closing times by day, organise menus into sections, maintain dish prices and availability, and keep dietary information close to the catalogue.'],
  ['03', 'Build customer loyalty', 'Create single-use QR rewards worth 0–1,000 points, choose expiry dates, credit existing customers and keep an auditable reason for every manual points change.'],
  ['04', 'Keep teams aligned', 'Give staff one place to review bookings, menus and rewards. Changes stay visible in the back office so the team can act on the latest service information.'],
];

export default function CapabilitiesPage() {
  return <><SiteHeader/><main className="subpage wrap"><p className="eyebrow">WHAT THE SYSTEM DOES</p><h1>Practical tools for a <em>better service.</em></h1><p className="subpage-intro">Pace brings the operational details of your venue together, so your team can spend less time switching systems and more time looking after guests.</p><div className="capability-page-grid">{capabilities.map(([number, title, copy])=><article key={number}><span>{number}</span><h2>{title}</h2><p>{copy}</p></article>)}</div><div className="subpage-callout"><h2>One connected back office.</h2><p>From the first booking to the next visit, give your team one reliable view of what matters.</p><Link className="button" href="/platform">Explore the platform <span><ArrowIcon/></span></Link></div></main><SiteFooter/></>;
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter, SiteHeader } from '../SiteChrome';
import { ArrowIcon } from '../WhatsAppLink';
import { metadata } from '../../lib/seo';

export const generateMetadata = (): Metadata => metadata('How Pace Works | Pace', 'Learn how Pace helps hospitality teams configure their venue, run service and build repeat visits.', '/how-it-works');

const steps = [['01', 'Configure your venue', 'Add tables and capacities, set opening and kitchen hours, and shape the system around the way your venue actually runs.'], ['02', 'Run the day from one diary', 'Review reservations, party sizes, notes and table assignments in a shared service view that is easy to scan before and during a shift.'], ['03', 'Keep menus current', 'Maintain sections, dishes, prices, availability and dietary information from the same back office your team uses for service planning.'], ['04', 'Keep guests coming back', 'Recognise regulars with trackable rewards and maintain a clear record of the points your team has issued.']];

export default function HowItWorksPage() {
  return <><SiteHeader/><main className="subpage wrap"><p className="eyebrow">FROM SETUP TO SERVICE</p><h1>A calmer rhythm for <em>every shift.</em></h1><p className="subpage-intro">Set the rules once, keep the information current and give every shift a reliable view of what is happening next.</p><div className="process-list">{steps.map(([number, title, copy])=><article key={number}><span>{number}</span><div><h2>{title}</h2><p>{copy}</p></div></article>)}</div><div className="subpage-callout"><h2>Less juggling. More looking after people.</h2><p>Bring your bookings, menus and rewards together with Pace.</p><Link className="button" href="/capabilities">See all capabilities <span><ArrowIcon/></span></Link></div></main><SiteFooter/></>;
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter, SiteHeader } from '../SiteChrome';
import { metadata } from '../../lib/seo';

export const generateMetadata = (): Metadata => metadata('The Pace Platform | Pace', 'Explore the connected Pace platform for restaurant bookings, menus and customer rewards.', '/platform');

export default function PlatformPage() {
  return <><SiteHeader/><main className="subpage wrap"><p className="eyebrow">ONE CONNECTED BACK OFFICE</p><h1>Everything in its place. <em>Service in sync.</em></h1><p className="subpage-intro">Pace is a focused hospitality platform for the work behind great service: bookings, tables, menus, kitchen hours and customer rewards.</p><div className="platform-cards"><article><span>01</span><h2>Bookings & tables</h2><p>See reservations, guest counts and table assignments together in a visual diary. Configure capacities and keep the floor plan clear for every shift.</p><Link href="/features/restaurant-booking-software">Explore bookings →</Link></article><article><span>02</span><h2>Menus & availability</h2><p>Organise sections and dishes, maintain prices, manage availability and keep dietary information alongside the catalogue your team uses.</p><Link href="/features/restaurant-menu-management">Explore menus →</Link></article><article><span>03</span><h2>Rewards & loyalty</h2><p>Create individual points rewards with QR codes and expiry dates, then add customer credits with a reason and a complete ledger history.</p><Link href="/features/restaurant-loyalty-rewards">Explore rewards →</Link></article></div><div className="subpage-callout"><h2>Built around the way hospitality works.</h2><p>Start with the tools your team needs today, with a clear foundation for the customer experiences you want to build next.</p><Link className="button" href="/how-it-works">See how it works <span>↗</span></Link></div></main><SiteFooter/></>;
}

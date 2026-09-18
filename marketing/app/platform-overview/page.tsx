import type { Metadata } from 'next';
import { AdvicePage } from '../AdvicePage';
import { metadata } from '../../lib/seo';
export const generateMetadata = (): Metadata => metadata('Platform overview | Pace', 'See how Pace connects guest experiences with the operational tools hospitality teams use every day.', '/platform-overview');
export default function PlatformOverviewPage() { return <AdvicePage eyebrow="PLATFORM OVERVIEW" title={<>One connected view of the <em>service.</em></>} intro="Pace brings the guest journey and the team’s working day closer together, without asking a venue to change everything at once." sections={[
  {title:'The guest experience',copy:'Guests can discover menus, make bookings, review upcoming visits and engage with loyalty from a clear, venue-branded experience.'},
  {title:'The back office',copy:'Teams manage bookings, tables, menus, opening rules and rewards from operational screens designed around real service decisions.'},
  {title:'The data layer',copy:'Venue content and operational records are kept distinct so menus and availability can be maintained while guest activity remains useful to the team.'},
  {title:'A practical rollout',copy:'Start with the workflow creating the most friction, then add guest-facing features, rewards and integrations as the operation is ready.'},
  {title:'A route to integration',copy:'The current platform supports the core workflows. Planned API access can provide a clearer path for teams that need to connect Pace with other systems.'},
  {title:'Built around service',copy:'The product is shaped by the details that matter on the floor: table capacity, booking duration, kitchen hours, menu availability and repeat visits.'}
]}/>; }

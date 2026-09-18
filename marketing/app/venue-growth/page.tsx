import type { Metadata } from 'next';
import { AdvicePage } from '../AdvicePage';
import { metadata } from '../../lib/seo';
export const generateMetadata = (): Metadata => metadata('Venue growth advice | Pace', 'A practical rollout approach for single venues and growing hospitality groups.', '/venue-growth');
export default function VenueGrowthPage() { return <AdvicePage eyebrow="VENUE GROWTH" title={<>Build the operation before you <em>scale it.</em></>} intro="Growth is easier when the underlying workflows are clear enough to repeat, review and improve across locations." sections={[
  {title:'Start where the pattern is visible',copy:'Use one venue or one workflow to learn what information the team actually needs and where the current process creates friction.'},
  {title:'Document the operating rules',copy:'Tables, booking durations, opening hours, kitchen hours and menu structures become useful building blocks when they are explicit.'},
  {title:'Create a repeatable playbook',copy:'Capture the setup decisions, staff responsibilities and review points that should travel to the next venue.'},
  {title:'Respect local differences',copy:'A shared platform should not force every venue into identical service. Keep common structure while preserving meaningful local rules.'},
  {title:'Add connections deliberately',copy:'As the operation grows, identify which systems need to exchange data and which workflows should remain simple and owned by the venue.'},
  {title:'Measure the work, not just the sales',copy:'Look at admin effort, information quality, staff confidence and guest clarity alongside commercial outcomes.'}
]}/>; }

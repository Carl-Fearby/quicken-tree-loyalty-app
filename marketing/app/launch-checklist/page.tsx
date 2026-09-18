import type { Metadata } from 'next';
import { AdvicePage } from '../AdvicePage';
import { metadata } from '../../lib/seo';
export const generateMetadata = (): Metadata => metadata('Venue launch checklist | Pace', 'A practical checklist for preparing a Pace venue rollout.', '/launch-checklist');
export default function LaunchChecklistPage() { return <AdvicePage eyebrow="LAUNCH CHECKLIST" title={<>A calmer route from setup to <em>service.</em></>} intro="Use this checklist to make the important decisions visible before a team starts using Pace in a live venue." sections={[
  {title:'Venue basics',copy:'Confirm the venue name, contact details, staff access and the person responsible for operational content.'},
  {title:'Tables and bookings',copy:'Check table names, capacities, booking duration, opening hours, kitchen hours and any service phases the team uses.'},
  {title:'Menus and dietary information',copy:'Review sections, dishes, descriptions, prices, availability and dietary details from the guest perspective.'},
  {title:'Guest journey',copy:'Walk through booking, upcoming visits, menu browsing and account or loyalty moments on the guest app.'},
  {title:'Team readiness',copy:'Show staff where to find the diary, how to update a booking, how to assign a table and who to ask when a rule needs changing.'},
  {title:'First-week review',copy:'Schedule a review after the first live services and capture improvements while the details are still fresh.'}
]}/>; }

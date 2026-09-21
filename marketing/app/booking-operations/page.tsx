import type { Metadata } from 'next';
import { AdvicePage } from '../AdvicePage';
import { metadata } from '../../lib/seo';
export const generateMetadata = (): Metadata => metadata('Booking operations guide | Pace', 'Practical advice for clearer booking operations, table assignment and service planning.', '/booking-operations');
export default function BookingOperationsPage() { return <AdvicePage eyebrow="BOOKING OPERATIONS" title={<>Make the booking diary easier to <em>trust.</em></>} intro="A useful diary is more than a list of names. It gives the team enough context to make good decisions before and during service." sections={[
  {title:'Keep the essentials visible',copy:'Guest count, contact details, booking time, notes and order-ahead information should be easy to find without opening several disconnected tools.'},
  {title:'Assign tables with context',copy:'Table capacities and existing assignments help the team balance the room while keeping the guest experience in view.'},
  {title:'Match the venue’s rhythm',copy:'Booking durations, opening hours, kitchen hours and service phases should reflect how each venue actually works.'},
  {title:'Review before service',copy:'A short pre-service review can surface large parties, unusual timings, order-ahead details and gaps in the diary before they become surprises.'},
  {title:'Leave a useful history',copy:'Clear edits and notes help the next person understand what changed and why, particularly when several team members share responsibility.'},
  {title:'Keep availability honest',copy:'The best booking experience is based on rules the venue can genuinely deliver, not availability that creates avoidable pressure on the floor.'}
]}/>; }

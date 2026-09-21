import type { Metadata } from 'next';
import { AdvicePage } from '../AdvicePage';
import { metadata } from '../../lib/seo';
export const generateMetadata = (): Metadata => metadata('Guest app and back office | Pace', 'Understand how the Pace guest app and venue back office work together.', '/guest-app-back-office');
export default function GuestAppBackOfficePage() { return <AdvicePage eyebrow="TWO SIDES OF SERVICE" title={<>A better guest experience starts with a better <em>working day.</em></>} intro="Pace gives guests a simple front door while giving venue teams the controls they need behind the scenes." sections={[
  {title:'Guests choose and plan',copy:'Guests can browse the menu, choose a booking time, view upcoming visits and engage with the venue’s loyalty experience.'},
  {title:'Teams see the diary',copy:'The booking diary gives staff a visual view of reservations, guest counts, table assignments, service phases and order-ahead details.'},
  {title:'Managers maintain the rules',copy:'Opening hours, kitchen hours, table capacities and booking duration can be kept aligned with how the venue actually operates.'},
  {title:'Menus stay useful',copy:'Menu sections, dishes, prices, availability and dietary information can be maintained centrally rather than scattered across documents.'},
  {title:'Rewards remain intentional',copy:'Teams can create QR rewards, set expiry dates, credit points manually when appropriate and keep a visible history.'},
  {title:'One joined-up journey',copy:'The aim is not more software for its own sake. It is less distance between what guests see and what staff need to deliver.'}
]}/>; }

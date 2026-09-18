import type { Metadata } from 'next';
import { AdvicePage } from '../AdvicePage';
import { metadata } from '../../lib/seo';
export const generateMetadata = (): Metadata => metadata('Getting started with hospitality software | Pace', 'A practical starting point for venues preparing to adopt Pace.', '/getting-started');
export default function GettingStartedPage() { return <AdvicePage eyebrow="CUSTOMER ADVICE" title={<>Start with the workflow that creates the most <em>friction.</em></>} intro="A successful rollout does not begin with every setting. It begins with a clear view of the team’s biggest operational pain point." sections={[
  {title:'Map the current journey',copy:'Write down what happens from a guest deciding to visit through to the booking, service and follow-up. Include the handoffs that currently rely on memory.'},
  {title:'Choose a focused first phase',copy:'A single venue may start with bookings and tables, menu maintenance or rewards. A focused phase makes training and feedback easier.'},
  {title:'Prepare the essentials',copy:'Gather opening hours, kitchen closing times, booking duration, table capacities, menu information and the staff access needed for launch.'},
  {title:'Make ownership clear',copy:'Decide who maintains menus, who reviews bookings, who manages rewards and who is responsible for checking that guest-facing information stays current.'},
  {title:'Review after real service',copy:'Use the first live period to identify where the workflow still feels slow or unclear, then adjust the process rather than adding unnecessary complexity.'},
  {title:'Build from evidence',copy:'A practical rollout is a conversation between the product and the people using it. Capture questions and improvements as the venue learns.'}
]}/>; }

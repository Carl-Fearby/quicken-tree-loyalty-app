import type { Metadata } from 'next';
import { AdvicePage } from '../AdvicePage';
import { metadata } from '../../lib/seo';
export const generateMetadata = (): Metadata => metadata('Hospitality software comparison | Pace', 'Questions to ask when comparing connected hospitality software with disconnected tools.', '/comparison');
export default function ComparisonPage() { return <AdvicePage eyebrow="BUYER GUIDE" title={<>Choose the system that fits the way your venue <em>works.</em></>} intro="The right comparison is not a race to count features. It is a check that the important workflows, ownership and rollout path make sense for your team." sections={[
  {title:'Where does the booking truth live?',copy:'Ask whether the team can see the information needed for service in one place, including guests, tables, timing and notes.'},
  {title:'Who maintains guest-facing content?',copy:'Check how menus, prices, availability and dietary information are updated, reviewed and reflected in the guest experience.'},
  {title:'What happens when service changes?',copy:'Look for clear controls for opening hours, kitchen hours, booking duration and capacity rather than workarounds that rely on memory.'},
  {title:'Can loyalty stay manageable?',copy:'Understand how rewards are created, how points are credited, what history is retained and how staff handle exceptions.'},
  {title:'How does implementation work?',copy:'Ask what information is needed, who supports setup, how staff learn the workflow and how feedback is handled after launch.'},
  {title:'What is genuinely available today?',copy:'Separate current capabilities from planned integrations, roadmap ideas and future API access. Honest scope makes a better buying decision.'}
]}/>; }

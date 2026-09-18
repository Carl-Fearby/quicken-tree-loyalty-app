import type { Metadata } from 'next';
import { AdvicePage } from '../AdvicePage';
import { metadata } from '../../lib/seo';
export const generateMetadata = (): Metadata => metadata('Loyalty guide for venues | Pace', 'Practical advice for designing thoughtful hospitality rewards and repeat visits.', '/loyalty-guide');
export default function LoyaltyGuidePage() { return <AdvicePage eyebrow="LOYALTY ADVICE" title={<>Make repeat visits feel <em>worthwhile.</em></>} intro="A good loyalty experience is clear for guests and manageable for the team. The reward should support the relationship, not create another administrative burden." sections={[
  {title:'Choose a simple value',copy:'Guests should understand how points are earned and what they unlock without needing a spreadsheet or a long explanation.'},
  {title:'Make the reward fit the venue',copy:'A reward should feel relevant to the way people already visit: a drink, a dish, a small upgrade or another thoughtful reason to return.'},
  {title:'Set a sensible expiry',copy:'Expiry can encourage action, but it should be easy to explain and aligned with the relationship you want to build.'},
  {title:'Give staff the right context',copy:'A visible points balance, reward history and a clear reason for manual credits help the team handle exceptions consistently.'},
  {title:'Use QR moments well',copy:'A QR reward can create a simple bridge between an in-venue moment and a future visit when the value is clear.'},
  {title:'Review what feels useful',copy:'Look for questions, unused rewards and manual work. Those signals can improve the programme more reliably than adding complexity.'}
]}/>; }

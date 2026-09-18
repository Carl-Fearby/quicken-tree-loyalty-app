import type { Metadata } from 'next';
import { AdvicePage } from '../AdvicePage';
import { metadata } from '../../lib/seo';

export const generateMetadata = (): Metadata => metadata('Support and implementation | Pace', 'Understand the support, onboarding and rollout questions to discuss with Pace.', '/support');

export default function SupportPage() {
  return <AdvicePage eyebrow="SUPPORT AND IMPLEMENTATION" title={<>The rollout should feel as considered as the <em>product.</em></>} intro="Support expectations are part of choosing operational software. We will agree the right level of setup guidance, training and ongoing help for your venue or group.">
    {[
      ['Before setup', 'We map your current workflow, identify the first phase and gather the venue information needed for tables, hours, menus, access and rewards.'],
      ['During configuration', 'The rollout conversation covers the operating rules that shape availability and the content guests will see, with clear ownership for future updates.'],
      ['Team onboarding', 'Staff should know where to find the diary, update a booking, assign a table and raise a content or configuration question before the first live service.'],
      ['After launch', 'A first-week review helps identify where the workflow still feels unclear and which changes will make the biggest practical difference.'],
      ['For groups', 'Multi-venue work can include shared standards, local differences, permissions, support responsibilities and a repeatable launch playbook.'],
      ['What to ask us', 'Ask directly about hosting, access, retention, exports, incident handling, response expectations and what is available today versus planned.'],
    ].map(([title, copy]) => <article key={title}><h2>{title}</h2><p>{copy}</p></article>)}
  </AdvicePage>;
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingPage } from '../MarketingPage';
import { metadata } from '../../lib/seo';

export const generateMetadata = (): Metadata => metadata('Pace workflow examples', 'See practical examples of how Pace can support booking, menu and loyalty workflows.', '/workflow-examples');

const examples = [
  ['A busy booking service', 'A manager reviews the diary, checks party sizes and table assignments, confirms order-ahead details and gives the floor team one view before service.', '/booking-operations'],
  ['A changing seasonal menu', 'A menu owner updates sections, dishes, prices, availability and dietary information in one maintained place before reviewing the guest view.', '/menu-management-guide'],
  ['A thoughtful repeat visit', 'A team creates a reward with a clear value and expiry, then records manual points with a reason when a guest needs a considered exception.', '/loyalty-guide'],
  ['A focused first rollout', 'A venue starts with the workflow creating the most admin, prepares its operational rules, trains the team and reviews the first live services before expanding.', '/getting-started'],
];

export default function WorkflowExamplesPage() {
  return <MarketingPage eyebrow="WORKFLOW EXAMPLES" title={<>See how the pieces work together in a <em>real day.</em></>} intro="These are product workflow examples, not customer claims. They show the kinds of operational conversations Pace is designed to support.">
    <div className="resource-grid">{examples.map(([title, copy, href]) => <article key={title}><h2>{title}</h2><p>{copy}</p><Link href={href}>Read the related guide <span>↗</span></Link></article>)}</div>
    <section className="resource-callout"><p className="eyebrow">HAVE A DIFFERENT WORKFLOW?</p><h2>Bring the actual process.</h2><p>A product conversation is most useful when it starts with the way your team works today, including the handoffs and exceptions that are easy to miss in a feature list.</p><Link className="button" href="/contact">Describe your workflow <span>↗</span></Link></section>
  </MarketingPage>;
}

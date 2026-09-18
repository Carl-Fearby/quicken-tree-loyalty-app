import type { Metadata } from 'next';
import { AdvicePage } from '../AdvicePage';
import { metadata } from '../../lib/seo';

export const generateMetadata = (): Metadata => metadata('Pace production readiness', 'The deployment, data and operational checks to complete before taking Pace live.', '/production-readiness');

export default function ProductionReadinessPage() {
  return <AdvicePage eyebrow="PRODUCTION READINESS" title={<>Know what needs checking before <em>launch.</em></>} intro="A clear launch checklist includes the product, the environment and the people responsible for using it. These are the conversations to complete before production use.">
    {[
      ['Environment and access', 'Confirm production URLs, authentication secrets, database credentials, staff roles and the origins allowed to connect to the API.'],
      ['Email and notifications', 'Configure the approved sender and recipient addresses, test delivery and confirm that replies reach the right team.'],
      ['Data and recovery', 'Agree hosting, backups, recovery expectations, retention, exports and incident responsibilities before live operational data is introduced.'],
      ['Content quality', 'Review venue details, tables, hours, menus, prices, availability, dietary information and rewards from both staff and guest views.'],
      ['Live workflow test', 'Run a booking from guest entry through diary review, table assignment and follow-up. Test menu changes and the relevant loyalty workflow separately.'],
      ['Ownership and support', 'Record who can change operational content, who reviews the first live services and who should be contacted when something needs attention.'],
    ].map(([title, copy]) => <article key={title}><h2>{title}</h2><p>{copy}</p></article>)}
  </AdvicePage>;
}

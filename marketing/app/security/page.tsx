import type { Metadata } from 'next';
import { LegalPage } from '../LegalPage';
import { metadata } from '../../lib/seo';

export const generateMetadata = (): Metadata => metadata('Security and data | Pace', 'How Pace approaches security, access and operational data.', '/security');

export default function SecurityPage() {
  return <LegalPage eyebrow="TRUST AND DATA" title="Security information, plainly explained." intro="Pace is being built for operational data that hospitality teams rely on. This page describes our current approach and the questions we will answer during a product or pilot conversation." sections={[
    ['Access and permissions', 'Back-office staff sign in with individual accounts. Administrators can manage users and assign permissions for booking read or write access, the customer list, rewards and each configuration area. Staff who can create users cannot grant access beyond their own permissions.'],
    ['Operational data', 'Bookings, menu information, venue settings and customer reward records belong to the venue using Pace. We do not use the marketing site to collect live booking or loyalty data.'],
    ['Backups and service continuity', 'We will agree the appropriate backup, recovery and continuity expectations for your rollout before production use. Pilot and implementation conversations are the right place to review the detail for your venue.'],
    ['Privacy and suppliers', 'Personal information is handled according to the Pace privacy notice. We will identify relevant service providers and data responsibilities before a venue begins using operational features.'],
    ['Questions before rollout', 'Ask about hosting, access controls, retention, exports, incident handling or data processing during your demo or pilot discussion. We will give a direct answer about what is available today and what is still being built.'],
  ]}/>;
}

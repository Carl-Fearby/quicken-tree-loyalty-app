import type { Metadata } from 'next';
import { AdvicePage } from '../AdvicePage';
import { metadata } from '../../lib/seo';

export const generateMetadata = (): Metadata => metadata('Build the business case for Pace', 'A practical framework for assessing the operational value of connected hospitality software.', '/business-case');

export default function BusinessCasePage() {
  return <AdvicePage eyebrow="BUSINESS CASE" title={<>Make the case for a calmer <em>operation.</em></>} intro="Use the questions below to estimate where clearer workflows could return time, reduce avoidable admin and improve the guest experience. Pace does not promise a result before understanding your operation.">
    {[
      ['Count the handoffs', 'List the places staff re-key booking details, check separate menu documents, or move information between systems. Those handoffs are a useful starting point for a pilot.'],
      ['Estimate the admin time', 'For a typical week, estimate how long the team spends correcting bookings, checking availability, updating menu information and answering questions that a clearer system could reduce.'],
      ['Include the service impact', 'Consider the cost of unclear table assignments, outdated guest-facing information and rewards that staff cannot explain consistently. Not every benefit needs to be reduced to a single number.'],
      ['Start with a measurable phase', 'Choose one workflow, record its current effort and review the same questions after the team has used Pace in real service. A small evidence-based pilot is more useful than a speculative forecast.'],
      ['Plan for adoption', 'Include setup, staff onboarding, content ownership and review time in the business case. A tool only creates value when the team can use and maintain it confidently.'],
      ['Compare the whole cost', 'Compare the cost of Pace with the time, duplication and operational uncertainty created by disconnected tools, not just the price of another subscription.'],
    ].map(([title, copy]) => <article key={title}><h2>{title}</h2><p>{copy}</p></article>)}
  </AdvicePage>;
}

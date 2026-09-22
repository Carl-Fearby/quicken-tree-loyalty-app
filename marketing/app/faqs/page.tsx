import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '../SiteChrome';
import { ArrowIcon } from '../WhatsAppLink';
import { jsonLd, metadata, siteUrl } from '../../lib/seo';

export const generateMetadata = (): Metadata => metadata('FAQs | Pace', 'Answers about Pace restaurant management software and its booking, menu and rewards tools.', '/faqs');

const groups = [
  ['About Pace', [
    ['Who is Pace designed for?', 'Pace is designed for hospitality teams managing table bookings, menus and customer loyalty, from independent cafés to restaurants, pubs and bars. It is intended for teams that want a clearer operational view without stitching together several disconnected tools.'],
    ['What problem does Pace solve?', 'Pace brings the information behind a good service into one connected system. Teams can plan reservations, maintain menus and manage customer rewards from the back office, while guests get a clearer way to book, browse and keep track of their visits.'],
    ['Is Pace for one venue or multiple venues?', 'Both. Pace essentials is suited to a single venue, while a group rollout can be shaped around multiple sites, shared standards and the permissions or support model your organisation needs.'],
    ['Does Pace replace our whole hospitality stack?', 'Pace focuses on the operational areas covered by the platform: bookings, tables, venue hours, menus and loyalty. During an initial conversation we can map those responsibilities against the tools you already use and identify a sensible starting point rather than assuming everything should change at once.'],
  ]],
  ['Bookings and service planning', [
    ['What does the booking diary show?', 'The visual diary brings reservations, times, guest counts, booking lengths and table assignments into one view. Your team can understand the shape of the service before guests arrive and review the same information during the shift.'],
    ['Can I assign specific tables?', 'Yes. Configure table numbers and seat capacities to reflect your floor, then assign tables to bookings. Availability can be reviewed against the selected date, time, party size and booking duration.'],
    ['Can I set different hours for different days?', 'Yes. Opening hours and kitchen closing times can be configured for each day. The booking flow uses those rules so a reservation cannot begin after the kitchen has closed or run beyond the venue’s closing time.'],
    ['What happens when service hours change?', 'Existing bookings remain visible so the team can review them rather than lose track of them. New booking availability follows the updated configuration, while the diary keeps the operational record available for follow-up.'],
    ['Can staff update or cancel a booking?', 'The back office is designed for staff to review booking details, notes and dietary requirements, make updates and cancel reservations from the same service view.'],
    ['Can I support larger parties?', 'The booking flow supports configurable guest options and larger party sizes. The right table and service rules can be discussed during setup so the configuration reflects how your venue handles larger groups.'],
  ]],
  ['Menus and availability', [
    ['What menu information can we manage?', 'Teams can organise menus into sections, maintain dish names and descriptions, update prices, manage availability and keep dietary information alongside the catalogue.'],
    ['Can menus change with the season?', 'Yes. Menu sections and dishes can be maintained as your offer changes. Pace gives the team one place to keep the information behind the customer-facing menu organised and current.'],
    ['Can we show unavailable dishes?', 'Availability can be managed in the back office so your team has a consistent source for what is currently offered. Service messages and unavailable items can also be maintained where your configuration needs them.'],
    ['Does menu information replace an allergy conversation?', 'No. Dietary labels support communication, but staff should always confirm specific allergy requirements with the kitchen and follow the venue’s own food-safety procedures.'],
    ['Can menus have different service periods?', 'The platform supports menu service periods and categories, so menus can be organised around the way your venue serves different offers during the day.'],
  ]],
  ['Rewards and loyalty', [
    ['How do rewards work?', 'Create a single-use reward worth 0–1,000 points, choose an expiry date and download its QR code. You can also add points to an existing customer account manually when a reason is recorded.'],
    ['What is recorded when points are added?', 'Each manual credit requires a reason and updates the customer balance and loyalty ledger. This gives your team a history of what changed rather than leaving points unexplained.'],
    ['Do reward codes expire?', 'Yes. Reward expiry defaults to three calendar months and can be changed when a code is created. Expiry applies to an unclaimed reward code, not points that have already been credited to a customer.'],
    ['Can a reward be used more than once?', 'No. The system is designed to enforce single use and expiry when a reward is claimed. Viewing or downloading a QR code does not consume it.'],
    ['Can we set different reward values?', 'Yes. Individual rewards can be created within the current 0–1,000 point range, allowing the team to match the gesture to the occasion or campaign.'],
    ['Is customer app redemption live?', 'The data model and reward rules support customer redemption, but customer app scanning and the staff code-entry screen are planned for a later update. Manual points credits are available now.'],
  ]],
  ['Guest app', [
    ['What can guests do in the app?', 'The guest experience is designed to let customers book a visit, choose an experience, browse menus, keep booking details close, view upcoming visits, manage profile preferences and stay connected to loyalty points and rewards.'],
    ['How does the app connect to the back office?', 'The app and back office are two sides of the same service journey. Venue configuration, opening hours, menu information, bookings and loyalty data provide the operational foundation for the guest-facing experience.'],
    ['Can guests see their upcoming bookings?', 'Yes. Upcoming visits are presented as part of the guest experience, making dates, times and booking details easier to find than searching through old messages.'],
    ['Can guests manage dietary or profile preferences?', 'The app experience is designed to keep profile preferences and dietary needs available to support more relevant bookings and conversations. Venue teams should still confirm specific requirements with the kitchen.'],
    ['Is the app ready to be branded for our venue?', 'The app is designed around venue content and configuration, including menus, events, rewards and venue details. A rollout conversation can establish the appropriate branding and content requirements.'],
  ]],
  ['Customers and staff access', [
    ['What does the customer list show?', 'The back office has a searchable list of registered app customers. Staff with customer access can see names, loyalty balances, booking counts and the latest booking date.'],
    ['Can staff have different permissions?', 'Yes. Booking access can be set to none, read or write. Customer access, rewards and each configuration area can be assigned separately to staff accounts. Administrators have full access.'],
    ['Can a staff member grant permissions they do not have?', 'No. A user who can manage accounts cannot give another person access to functions beyond their own permissions.'],
    ['Can rewards be turned off?', 'Yes. A rewards setting hides rewards in both the back office and guest app when disabled, while keeping existing reward data.'],
  ]],
  ['Getting started, pricing and support', [
    ['How is Pace priced?', 'Pricing is shaped around the venue rather than presented as a misleading one-size-fits-all number. We consider the number of venues, tables and menus, team access, rollout needs and the support required.'],
    ['Which plan should we choose?', 'Pace essentials is a sensible starting point for bookings, tables, hours and menu administration. Pace growth adds customer points and reward management, while Pace group is intended for multi-venue rollouts.'],
    ['How long does setup take?', 'The timeline depends on the number of venues, the information you want to bring across and how your team works today. We can define a practical first phase and identify the configuration needed before launch.'],
    ['Do we need technical staff to use Pace?', 'Pace is designed for hospitality teams, not specialist developers. The important setup decisions are operational: your tables, service hours, menus, permissions and reward approach.'],
    ['Can we start with one part of the platform?', 'Yes. A focused rollout can begin with the area that creates the most friction, such as the booking diary or menu administration, then expand as the team is comfortable.'],
    ['What support is available?', 'Support and rollout expectations are part of the initial conversation. We can discuss setup guidance, team onboarding and the level of ongoing help appropriate for your venue or group.'],
  ]],
  ['Data, privacy and next steps', [
    ['Does the marketing site collect booking or loyalty data?', 'No. The marketing site is separate from venue operations. The contact form collects the details you choose to submit so the Pace team can respond to your enquiry.'],
    ['How should we assess Pace for our venue?', 'Start by describing your current booking, menu and loyalty workflow, where staff lose time and what guests struggle to find. We can then map the relevant Pace capabilities to that process.'],
    ['Can we see the product before deciding?', 'The marketing site includes product views and app screens, and a product conversation can walk through the relevant workflows in more detail.'],
    ['What is planned for later?', 'The product is being developed in stages. Customer app scanning and the staff reward code-entry screen are planned for a later update; current capabilities are described on the platform and feature pages.'],
    ['How do I talk to the Pace team?', 'Use the contact form to share your venue, role and the workflow you want to improve. A clear description helps us make the first conversation useful.'],
  ]],
];

export default function FaqPage() {
  const faqQuestions = groups.flatMap(([, questions]) => questions as string[][]).map(([name, text]) => ({'@type': 'Question', name, acceptedAnswer: {'@type': 'Answer', text}}));
  const faqSchema = {'@context': 'https://schema.org', '@type': 'FAQPage', ...(siteUrl ? {url: `${siteUrl}/faqs`} : {}), mainEntity: faqQuestions};
  return <><SiteHeader/><main tabIndex={-1} id="main" className="subpage faq-page wrap"><script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd(faqSchema)}}/><p className="eyebrow">A FEW GOOD QUESTIONS</p><h1>Let’s clear the <em>table.</em></h1><p className="subpage-intro">Straight answers about what Pace does today, how the connected platform works and what a sensible rollout could look like for your venue.</p><div className="faq-index">{groups.map(([title])=><a key={title as string} href={`#${(title as string).toLowerCase().replace(/[^a-z]+/g, '-')}`}>{title as string} <span><ArrowIcon direction="down"/></span></a>)}</div><div className="faq-page-list">{groups.map(([title, questions])=><section className="faq-group" id={(title as string).toLowerCase().replace(/[^a-z]+/g, '-')} key={title as string}><p className="eyebrow">{title as string}</p>{(questions as string[][]).map(([question, answer])=><details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</section>)}</div><div className="subpage-callout"><h2>Still have a question?</h2><p>Tell us about your venue and the workflow you want to improve. We’ll help you find the relevant part of Pace.</p><a className="button" href="/contact">Talk to the Pace team <span><ArrowIcon/></span></a></div></main><SiteFooter/></>;
}

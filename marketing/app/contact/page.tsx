import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter, SiteHeader } from '../SiteChrome';
import ContactForm from './ContactForm';
import { ArrowIcon } from '../WhatsAppLink';
import { metadata } from '../../lib/seo';
export const generateMetadata = (): Metadata => metadata('Contact Pace', 'Talk to Pace about bringing bookings, menus and customer rewards together for your venue.', '/contact');
export default function ContactPage() { return <><SiteHeader/><main tabIndex={-1} id="main" className="subpage contact-page wrap"><p className="eyebrow">BOOK A DEMO OR START A CONVERSATION</p><h1>Make service feel <em>more in sync.</em></h1><p className="subpage-intro">Book a product demo, discuss a pilot, request API information or tell us what you want to improve. We’ll help you find a practical next step.</p><div className="contact-layout"><ContactForm/><aside className="contact-aside"><span>WHAT TO EXPECT</span><h2>A practical conversation, not a sales script.</h2><p>Share what is slowing your team down. We will respond with a clear view of what is available now, how a rollout could work and what comes next.</p><Link className="text-link" href="/implementation">See how rollout works <span><ArrowIcon/></span></Link></aside></div></main><SiteFooter/></>; }

import type { Metadata } from 'next';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { faCalendarCheck, faEnvelope, faPhone } from '@fortawesome/free-solid-svg-icons';
import { metadata } from '../../lib/seo';
import { SiteFooter, SiteHeader } from '../SiteChrome';
import ContactForm from './ContactForm';
import { ArrowIcon, whatsappUrl } from '../WhatsAppLink';

export const generateMetadata = (): Metadata => metadata('Talk to Pace', 'Choose the best way to get in touch with Pace: message us, call, email, or send an enquiry form.', '/contact');

export default function ContactPage() {
  return <>
	<SiteHeader/>
	<main tabIndex={-1} id="main" className="subpage contact-page wrap">
	  <p className="eyebrow">TALK TO PACE</p>
	  <h1>Choose the easiest way to reach us.</h1>
	  <p className="subpage-intro">Send us a message in the form, chat on WhatsApp, or contact us directly by email or phone. We will help you find the right next step for your venue.</p>
	  <div className="contact-layout">
		<ContactForm/>
		<aside className="contact-aside talk-to-us-aside">
		  <span>CONTACT OPTIONS</span>
		  <h2>Pick the channel that suits your day.</h2>
		  <p>For quick questions, WhatsApp is usually fastest. For planning and rollout details, email or a short call works best.</p>
		  <div className="talk-to-us-options" role="list">
			<a className="talk-to-us-option talk-to-us-option-primary" href={whatsappUrl} target="_blank" rel="noreferrer" role="listitem">
			  <div className="talk-to-us-option-head"><span className="talk-to-us-option-icon" aria-hidden="true"><FontAwesomeIcon icon={faWhatsapp}/></span><strong>WhatsApp</strong></div>
			  <small>Fastest route for quick questions</small>
			  <span>Start chat <ArrowIcon/></span>
			</a>
			<a className="talk-to-us-option" href="mailto:carl@pacevenues.com" role="listitem">
			  <div className="talk-to-us-option-head"><span className="talk-to-us-option-icon" aria-hidden="true"><FontAwesomeIcon icon={faEnvelope}/></span><strong>Email</strong></div>
			  <small>carl@pacevenues.com</small>
			  <span>Send email <ArrowIcon/></span>
			</a>
			<a className="talk-to-us-option" href="tel:+447940147138" role="listitem">
			  <div className="talk-to-us-option-head"><span className="talk-to-us-option-icon" aria-hidden="true"><FontAwesomeIcon icon={faPhone}/></span><strong>Phone</strong></div>
			  <small>+44 7940 147138</small>
			  <span>Call now <ArrowIcon/></span>
			</a>
			<Link className="talk-to-us-option" href="/contact?enquiry=demo" role="listitem">
			  <div className="talk-to-us-option-head"><span className="talk-to-us-option-icon" aria-hidden="true"><FontAwesomeIcon icon={faCalendarCheck}/></span><strong>Guided demo</strong></div>
			  <small>Walk through Pace with your team goals</small>
			  <span>Book demo <ArrowIcon/></span>
			</Link>
		  </div>
		</aside>
	  </div>
	</main>
	<SiteFooter/>
  </>;
}

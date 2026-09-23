'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ArrowIcon } from '../WhatsAppLink';

type FormState = 'idle' | 'sending' | 'sent' | 'error';

export default function ContactForm({ initialEnquiry = '' }: { initialEnquiry?: string }) {
  const [state, setState] = useState<FormState>('idle');
  const [message, setMessage] = useState('');
  const [enquiryType, setEnquiryType] = useState(initialEnquiry);

  useEffect(() => {
    const enquiry = new URLSearchParams(window.location.search).get('enquiry');
    if (enquiry === 'demo') setEnquiryType('Book a product demo');
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('sending');
    setMessage('');
    const form = event.currentTarget;
    let response: Response;
    try {
      response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000'}/contact`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
    } catch {
      setState('error');
      setMessage('We could not reach the enquiry service. Please try again later.');
      return;
    }
    if (response.ok) {
      form.reset();
      setState('sent');
      setMessage('Thanks — your enquiry has been sent. We will be in touch shortly with a practical next step.');
      return;
    }
    const result = await response.json().catch(() => ({}));
    setState('error');
    setMessage(typeof result.error === 'string' ? result.error : typeof result.message === 'string' ? result.message : 'We could not send your message. Please try again.');
  }

  return <form className="contact-form" onSubmit={submit}>
    <div className="form-row"><label>Name<input name="name" required minLength={2} maxLength={100} autoComplete="name"/></label><label>Work email<input name="email" required type="email" maxLength={254} autoComplete="email"/></label></div>
    <label>Venue or company<input name="venue" required minLength={2} maxLength={120} autoComplete="organization"/></label>
    <div className="form-row"><label>Number of venues<select name="venueCount" defaultValue=""><option value="" disabled>Select an option</option><option>One venue</option><option>2–5 venues</option><option>6+ venues</option></select></label><label>What would you like to do?<select name="enquiryType" value={enquiryType} onChange={event => setEnquiryType(event.target.value)}><option value="" disabled>Select an option</option><option>Book a product demo</option><option>Discuss a pilot</option><option>Request API information</option><option>Ask a general question</option></select></label></div>
    <label>How can we help?<textarea name="message" required minLength={10} maxLength={4000} rows={6}/></label>
    <button className="button" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send enquiry'} <span><ArrowIcon/></span></button>
    {message && <p className={`form-message ${state}`} role={state === 'error' ? 'alert' : 'status'}>{message}</p>}
  </form>;
}

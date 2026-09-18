import {MailtrapClient} from 'mailtrap';
import {NextResponse} from 'next/server';

const clean = (value: unknown, maxLength: number) => typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character] ?? character));

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = clean(body?.name, 100);
  const email = clean(body?.email, 254).toLowerCase();
  const venue = clean(body?.venue, 120);
  const venueCount = clean(body?.venueCount, 40);
  const enquiryType = clean(body?.enquiryType, 80);
  const message = clean(body?.message, 4000);
  if (name.length < 2 || venue.length < 2 || message.length < 10 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({error: 'Please complete all fields with a valid email address.'}, {status: 400});
  }

  const token = process.env.MAILTRAP_API_KEY;
  const from = process.env.MAIL_FROM_ADDRESS;
  const recipient = process.env.MAIL_TO_ADDRESS;
  if (!token || !from || !recipient) {
    console.error('Contact email delivery is not configured.');
    return NextResponse.json({error: 'Contact email is temporarily unavailable. Please try again later.'}, {status: 503});
  }

  const client = new MailtrapClient({token});
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeVenue = escapeHtml(venue);
  const safeVenueCount = escapeHtml(venueCount || 'Not provided');
  const safeEnquiryType = escapeHtml(enquiryType || 'Not provided');
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
  await client.send({
    from: {email: from, name: process.env.MAIL_FROM_NAME ?? 'Pace'},
    to: [{email: recipient}],
    reply_to: {email, name},
    subject: `New Pace enquiry from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\nVenue: ${venue}\nNumber of venues: ${venueCount || 'Not provided'}\nEnquiry type: ${enquiryType || 'Not provided'}\n\n${message}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#152c37"><h2>New Pace enquiry</h2><p><strong>Name:</strong> ${safeName}<br><strong>Email:</strong> ${safeEmail}<br><strong>Venue:</strong> ${safeVenue}<br><strong>Number of venues:</strong> ${safeVenueCount}<br><strong>Enquiry type:</strong> ${safeEnquiryType}</p><p>${safeMessage}</p></div>`
  });
  return NextResponse.json({ok: true});
}

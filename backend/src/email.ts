import {MailtrapClient} from 'mailtrap';
import {config} from './config';

const client = config.MAILTRAP_API_KEY ? new MailtrapClient({token: config.MAILTRAP_API_KEY}) : null;

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
}[character] ?? character));

export async function sendPasswordResetEmail(email: string, displayName: string, token: string) {
    if (!client || !config.MAIL_FROM_ADDRESS) {
        throw new Error('Email delivery is not configured.');
    }

    const resetUrl = new URL(config.FRONTEND_URL);
    resetUrl.searchParams.set('token', token);
    const name = escapeHtml(displayName);
    const link = resetUrl.toString();
    const venueName = escapeHtml(config.VENUE_NAME);
    const subject = `Reset your ${config.VENUE_NAME} password`;
    const text = `Hello ${displayName},\n\nWe received a request to reset your password for ${config.VENUE_NAME}. Use this link within 30 minutes:\n${link}\n\nIf you did not request this, you can safely ignore this email.`;
    const html = `<!doctype html><html><body style="margin:0;background:#f5f6f8;padding:32px 16px;font-family:Arial,sans-serif;color:#252b36"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #e2e5eb;border-radius:18px;overflow:hidden"><tr><td style="padding:32px 36px;background:#c5233b;color:#fff"><div style="font-size:13px;font-weight:800;letter-spacing:1.8px">${venueName.toUpperCase()}</div><h1 style="margin:18px 0 0;font-size:29px;line-height:1.15">Reset your password</h1></td></tr><tr><td style="padding:34px 36px;font-size:16px;line-height:1.55"><p style="margin-top:0">Hello ${name},</p><p>We received a request to reset the password for your ${venueName} account.</p><p style="margin:28px 0"><a href="${link}" style="display:inline-block;background:#c5233b;color:#fff;padding:13px 20px;border-radius:10px;text-decoration:none;font-weight:700">Reset password</a></p><p>This link expires in 30 minutes. If you did not request a reset, you can safely ignore this email.</p><p style="margin-bottom:0;color:#697386;font-size:13px">If the button does not work, copy this link into your browser:<br><a href="${link}" style="color:#c5233b;word-break:break-all">${link}</a></p></td></tr></table></td></tr></table></body></html>`;

    await client.send({
        from: {email: config.MAIL_FROM_ADDRESS, name: config.MAIL_FROM_NAME},
        to: [{email}],
        subject,
        text,
        html
    });
}

export async function sendContactEmail(fields: {name: string; email: string; venue: string; venueCount?: string; enquiryType?: string; message: string}) {
    if (!client || !config.MAIL_FROM_ADDRESS || !config.MAIL_TO_ADDRESS) {
        throw new Error('Contact email delivery is not configured.');
    }

    const name = escapeHtml(fields.name);
    const email = escapeHtml(fields.email);
    const venue = escapeHtml(fields.venue);
    const venueCount = escapeHtml(fields.venueCount || 'Not provided');
    const enquiryType = escapeHtml(fields.enquiryType || 'Not provided');
    const message = escapeHtml(fields.message).replace(/\n/g, '<br>');
    await client.send({
        from: {email: config.MAIL_FROM_ADDRESS, name: config.MAIL_FROM_NAME},
        to: [{email: config.MAIL_TO_ADDRESS}],
        reply_to: {email: fields.email, name: fields.name},
        subject: `New Pace enquiry from ${fields.name}`,
        text: `Name: ${fields.name}\nEmail: ${fields.email}\nVenue: ${fields.venue}\nNumber of venues: ${fields.venueCount || 'Not provided'}\nEnquiry type: ${fields.enquiryType || 'Not provided'}\n\n${fields.message}`,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#152c37"><h2>New Pace enquiry</h2><p><strong>Name:</strong> ${name}<br><strong>Email:</strong> ${email}<br><strong>Venue:</strong> ${venue}<br><strong>Number of venues:</strong> ${venueCount}<br><strong>Enquiry type:</strong> ${enquiryType}</p><p>${message}</p></div>`
    });
}

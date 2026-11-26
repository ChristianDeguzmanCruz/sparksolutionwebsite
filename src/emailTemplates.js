const { esc } = require('./mailer');

const SITE = {
  name: 'Spark Solution',
  tagline: 'Solutions that make running your business easier.',
  email: 'sparksolutionservice@gmail.com',
  phone: '0912-165-7915',
  location: 'Bulakan, Bulacan, Central Luzon, Philippines',
  facebook: 'Spark Solution',
  hours: 'Mon to Fri, 9:00 AM to 4:00 PM',
};

const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";

// Shared branded layout. Email clients ignore most CSS, so this uses tables + inline styles.
function layout({ preheader = '', title, intro = '', rows = [], button, note = '', greeting = '' }) {
  const rowsHtml = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #ECEAF6;font:700 12px ${FONT};letter-spacing:1px;text-transform:uppercase;color:#7B4DFF;width:130px;vertical-align:top">${esc(label)}</td>
        <td style="padding:12px 0;border-bottom:1px solid #ECEAF6;font:400 16px/1.5 ${FONT};color:#14122B;vertical-align:top">${value}</td>
      </tr>`
    )
    .join('');

  const buttonHtml = button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px"><tr>
         <td style="border-radius:999px;background:#7B4DFF;background-image:linear-gradient(90deg,#7B4DFF,#F0589B)">
           <a href="${esc(button.href)}" style="display:inline-block;padding:14px 30px;font:700 16px ${FONT};color:#ffffff;text-decoration:none;border-radius:999px">${esc(button.label)}</a>
         </td></tr></table>`
    : '';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#F4F3FB">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F4F3FB">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F3FB"><tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">
    <tr><td style="background:#1B1363;background-image:linear-gradient(135deg,#0B0A2A 0%,#1B1363 45%,#5C2DA3 80%,#D9509A 100%);padding:28px 32px">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle"><img src="cid:spark-logo" width="48" height="48" alt="Spark Solution logo" style="display:block;border:0"></td>
        <td style="vertical-align:middle;padding-left:12px;font:400 22px ${FONT};color:#ffffff"><b>Spark</b> Solution</td>
      </tr></table>
      <div style="margin-top:14px;font:400 14px ${FONT};color:#D6D3F2">${esc(SITE.tagline)}</div>
    </td></tr>
    <tr><td style="height:4px;line-height:4px;font-size:0;background:#7B4DFF;background-image:linear-gradient(90deg,#2F6BFF,#7B4DFF,#F0589B)">&nbsp;</td></tr>
    <tr><td style="padding:36px 32px 28px">
      ${greeting ? `<p style="margin:0 0 8px;font:400 16px ${FONT};color:#5B5878">${greeting}</p>` : ''}
      <h1 style="margin:0 0 14px;font:700 26px/1.2 ${FONT};color:#14122B">${esc(title)}</h1>
      ${intro ? `<p style="margin:0 0 20px;font:400 16px/1.6 ${FONT};color:#5B5878">${intro}</p>` : ''}
      ${rows.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #ECEAF6">${rowsHtml}</table>` : ''}
      ${buttonHtml}
      ${note ? `<p style="margin:20px 0 0;font:400 14px/1.6 ${FONT};color:#5B5878">${note}</p>` : ''}
    </td></tr>
    <tr><td style="background:#14122B;padding:24px 32px;font:400 13px/1.7 ${FONT};color:#D6D3F2">
      <b style="color:#ffffff;font-size:15px">${esc(SITE.name)}</b><br>
      Web and system development for business owners<br>
      <a href="mailto:${SITE.email}" style="color:#FFB3D4;text-decoration:none">${SITE.email}</a> &nbsp;·&nbsp; Facebook: ${esc(SITE.facebook)}<br>
      Phone: ${esc(SITE.phone)}<br>
      ${esc(SITE.location)}<br>
      Call hours: ${esc(SITE.hours)}
    </td></tr>
  </table>
  <p style="margin:16px 0 0;font:400 12px ${FONT};color:#8C89A8">© 2026 ${esc(SITE.name)}. You are receiving this email because of a request made on our website.</p>
</td></tr></table>
</body></html>`;
}

const multi = (s) => esc(s).replace(/\n/g, '<br>') || '-';
const footerText = `\n\n${SITE.name}\n${SITE.tagline}\n${SITE.email} | Phone: ${SITE.phone}\n${SITE.location}\nFacebook: ${SITE.facebook}\nCall hours: ${SITE.hours}`;

// ---------- Booking ----------
function bookingConfirmation({ name, slot, business, topic, calendarUrl }) {
  return {
    subject: `Your call with Spark Solution is booked: ${slot}`,
    html: layout({
      preheader: `Your call is booked for ${slot}.`,
      greeting: `Hi ${esc(name)},`,
      title: 'Your call is booked',
      intro: 'Thank you for choosing Spark Solution. Here are the details of your call. We will reach out before then if we need anything more.',
      rows: [
        ['When', `<b>${esc(slot)}</b>`],
        ['Duration', '1 hour'],
        ['Business', esc(business) || '-'],
        ['Your notes', multi(topic)],
      ],
      button: { label: 'Add to Google Calendar', href: calendarUrl },
      note: `Need to change the time? Just reply to this email and we will sort it out.`,
    }),
    text: `Hi ${name},\n\nYour call with Spark Solution is booked.\nWhen: ${slot}\nDuration: 1 hour\n\nNeed to change the time? Just reply to this email.${footerText}`,
  };
}

function bookingNotice({ name, email, phone, business, topic, slot }) {
  return {
    subject: `New booking: ${slot} (${name})`,
    html: layout({
      preheader: `${name} booked ${slot}.`,
      title: 'New booking',
      intro: 'A visitor booked a call on the website.',
      rows: [
        ['When', `<b>${esc(slot)}</b>`],
        ['Name', esc(name)],
        ['Email', `<a href="mailto:${esc(encodeURIComponent(email))}" style="color:#7B4DFF">${esc(email)}</a>`],
        ['Phone', esc(phone) || '-'],
        ['Business', esc(business) || '-'],
        ['Needs', multi(topic)],
      ],
      button: { label: `Reply to ${name}`, href: `mailto:${encodeURIComponent(email)}` },
    }),
    text: `New booking\nWhen: ${slot}\nName: ${name}\nEmail: ${email}\nPhone: ${phone || '-'}\nBusiness: ${business || '-'}\nNeeds: ${topic || '-'}`,
  };
}

// ---------- Contact ----------
function messageReceived({ name, subject, message }) {
  return {
    subject: 'We received your message | Spark Solution',
    html: layout({
      preheader: 'Thanks for writing to us. We will reply by email.',
      greeting: `Hi ${esc(name)},`,
      title: 'We got your message',
      intro: 'Thank you for contacting Spark Solution. We read every message and will reply by email as soon as we can. Here is a copy of what you sent.',
      rows: [
        ['Subject', esc(subject) || '-'],
        ['Message', multi(message)],
      ],
      button: { label: 'Book a call instead', href: `${process.env.SITE_URL || 'http://localhost:3000'}/booking.html` },
      note: 'You can reply to this email to add more details.',
    }),
    text: `Hi ${name},\n\nThank you for contacting Spark Solution. We will reply by email soon.\n\nSubject: ${subject || '-'}\nMessage: ${message}${footerText}`,
  };
}

function messageNotice({ name, email, subject, message }) {
  return {
    subject: `New message: ${(subject || 'No subject').replace(/[\r\n]+/g, ' ')}`,
    html: layout({
      preheader: `${name} sent a message.`,
      title: 'New message',
      intro: 'A visitor sent a message from the contact form.',
      rows: [
        ['Name', esc(name)],
        ['Email', `<a href="mailto:${esc(encodeURIComponent(email))}" style="color:#7B4DFF">${esc(email)}</a>`],
        ['Subject', esc(subject) || '-'],
        ['Message', multi(message)],
      ],
      button: { label: `Reply to ${name}`, href: `mailto:${encodeURIComponent(email)}` },
    }),
    text: `New message\nName: ${name}\nEmail: ${email}\nSubject: ${subject || '-'}\n\n${message}`,
  };
}

module.exports = { bookingConfirmation, bookingNotice, messageReceived, messageNotice };

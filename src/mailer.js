const path = require('path');

// Escape user text so it can't inject HTML into our emails
const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Two ways to send, chosen by .env:
//  - BREVO_API_KEY set  -> Brevo email API over HTTPS (works on any hosting)
//  - otherwise          -> Gmail SMTP (works on your own computer)
const useBrevo = () => Boolean(process.env.BREVO_API_KEY);
const senderEmail = () => process.env.BREVO_SENDER || process.env.SMTP_USER;

// The logo in emails: attached inside the email for SMTP, or loaded from our website for the API
const logoSrc = () =>
  useBrevo() ? `${process.env.SITE_URL || 'http://localhost:3000'}/img/logo-mark.png` : 'cid:spark-logo';

const logoAttachment = {
  filename: 'spark-solution-logo.png',
  path: path.join(__dirname, 'assets', 'logo-mark.png'),
  cid: 'spark-logo',
};

let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = require('nodemailer').createTransport({
      service: 'gmail',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

async function sendWithBrevo({ to, replyTo, subject, html, text }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Spark Solution', email: senderEmail() },
      to: [{ email: to }],
      ...(replyTo ? { replyTo: { email: replyTo } } : {}),
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
}

// Never let a failed email break the booking: log it and move on
async function sendMail(options) {
  try {
    if (useBrevo()) return await sendWithBrevo(options);
    const { to, replyTo, subject, html, text } = options;
    await getTransporter().sendMail({
      from: `"Spark Solution" <${process.env.SMTP_USER}>`,
      to, replyTo, subject, html, text,
      attachments: [logoAttachment],
    });
  } catch (err) {
    console.error('Email failed:', err.message);
  }
}

module.exports = { sendMail, esc, logoSrc };

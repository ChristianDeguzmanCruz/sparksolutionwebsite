const path = require('path');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// Escape user text so it can't inject HTML into our emails
const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// The logo travels inside the email (cid), so it shows even though the site is not public yet
const logo = {
  filename: 'spark-solution-logo.png',
  path: path.join(__dirname, 'assets', 'logo-mark.png'),
  cid: 'spark-logo',
};

// Never let a failed email break the booking: log it and move on
async function sendMail({ to, replyTo, subject, html, text }) {
  try {
    await transporter.sendMail({
      from: `"Spark Solution" <${process.env.SMTP_USER}>`,
      to,
      replyTo,
      subject,
      html,
      text,
      attachments: [logo],
    });
  } catch (err) {
    console.error('Email failed:', err.message);
  }
}

module.exports = { sendMail, esc };

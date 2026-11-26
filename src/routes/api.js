const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const { sendMail } = require('../mailer');
const mail = require('../emailTemplates');

const router = express.Router();

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const when = (date, hour) => {
  const [y, m, d] = date.split('-').map(Number);
  const dow = DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const t = `${hour % 12 === 0 ? 12 : hour % 12}:00 ${hour < 12 ? 'AM' : 'PM'}`;
  return `${dow}, ${MONTHS[m - 1]} ${d}, ${y} at ${t}`;
};

// Link that adds the call to the customer's Google Calendar
const calendarUrl = (date, hour) => {
  const d = date.replace(/-/g, '');
  const t = (h) => String(h).padStart(2, '0') + '0000';
  return (
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    '&text=' + encodeURIComponent('Call with Spark Solution') +
    `&dates=${d}T${t(hour)}/${d}T${t(hour + 1)}&ctz=Asia/Manila`
  );
};

// Mon-Fri. One-hour calls starting at these hours (24h clock): 9, 10, 11, 1PM, 2PM, 3PM
const HOURS = [9, 10, 11, 13, 14, 15];
const emailOk = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

function validDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const day = new Date(date + 'T00:00:00Z').getUTCDay();
  return day >= 1 && day <= 5 && date >= today();
}

// Rate limits are skipped while running tests (Jest sets NODE_ENV=test)
const skipInTests = () => process.env.NODE_ENV === 'test';

router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, skip: skipInTests }));

// Stricter limit for anything that writes data or sends email (stops spam)
const writeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  skip: skipInTests,
  message: { error: 'Too many requests. Please try again later.' },
});

// Which hours are still free on a date
router.get('/slots', async (req, res) => {
  const { date } = req.query;
  if (!validDate(date)) return res.status(400).json({ error: 'Pick a weekday from today onward.' });
  const { rows } = await pool.query('SELECT hour FROM bookings WHERE booking_date = $1', [date]);
  const taken = rows.map((r) => r.hour);
  res.json({ date, hours: HOURS, available: HOURS.filter((h) => !taken.includes(h)) });
});

// Book a slot
router.post('/bookings', writeLimiter, async (req, res) => {
  if (req.body.website) return res.status(201).json({ ok: true }); // honeypot: bots fill this
  const name = clean(req.body.name, 100);
  const email = clean(req.body.email, 200);
  const phone = clean(req.body.phone, 40);
  const business = clean(req.body.business, 120);
  const topic = clean(req.body.topic, 2000);
  const { date } = req.body;
  const hour = Number(req.body.hour);

  if (!name || !emailOk(email) || !validDate(date) || !HOURS.includes(hour)) {
    return res.status(400).json({ error: 'Please check your date, time, name and email.' });
  }
  try {
    await pool.query(
      `INSERT INTO bookings (name, email, phone, business, topic, booking_date, hour)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [name, email, phone || null, business || null, topic || null, date, hour]
    );

    const slot = when(date, hour);
    const team = mail.bookingNotice({ name, email, phone, business, topic, slot });
    sendMail({ to: process.env.NOTIFY_TO, replyTo: email, ...team });
    const customer = mail.bookingConfirmation({ name, slot, business, topic, calendarUrl: calendarUrl(date, hour) });
    sendMail({ to: email, ...customer });

    res.status(201).json({ ok: true });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'That time was just taken. Please pick another.' });
    throw err;
  }
});

// Contact message
router.post('/contact', writeLimiter, async (req, res) => {
  if (req.body.website) return res.status(201).json({ ok: true }); // honeypot: bots fill this
  const name = clean(req.body.name, 100);
  const email = clean(req.body.email, 200);
  const subject = clean(req.body.subject, 150);
  const message = clean(req.body.message, 4000);
  if (!name || !emailOk(email) || !message) {
    return res.status(400).json({ error: 'Please fill in your name, email and message.' });
  }
  await pool.query(
    'INSERT INTO contacts (name, email, subject, message) VALUES ($1, $2, $3, $4)',
    [name, email, subject || null, message]
  );

  sendMail({ to: process.env.NOTIFY_TO, replyTo: email, ...mail.messageNotice({ name, email, subject, message }) });
  sendMail({ to: email, ...mail.messageReceived({ name, subject, message }) });

  res.status(201).json({ ok: true });
});

module.exports = router;

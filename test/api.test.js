// Replace the database and the email sender with fakes: tests never touch Neon or Gmail
jest.mock('../src/db', () => ({ query: jest.fn() }));
jest.mock('../src/mailer', () => ({
  ...jest.requireActual('../src/mailer'), // keep the real esc()
  sendMail: jest.fn(),
}));

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db');
const { sendMail } = require('../src/mailer');
const templates = require('../src/emailTemplates');

process.env.NOTIFY_TO = 'team@test.com';

// Find the next date that falls on the given weekdays (Mon=1 ... Sat=6), in Manila time
function nextDate(days) {
  const d = new Date();
  for (;;) {
    d.setUTCDate(d.getUTCDate() + 1);
    const s = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    if (days.includes(new Date(s + 'T00:00:00Z').getUTCDay())) return s;
  }
}
const weekday = nextDate([1, 2, 3, 4, 5]);
const saturday = nextDate([6]);

const goodBooking = { name: 'Maria', email: 'maria@test.com', date: weekday, hour: 9 };

beforeEach(() => {
  jest.resetAllMocks();
  pool.query.mockResolvedValue({ rows: [] });
});

describe('health and security', () => {
  test('GET /api/health works', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('sends a strict CSP and hides x-powered-by', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toContain("script-src 'self'");
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('unknown API route returns JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  test('broken JSON returns 400', async () => {
    const res = await request(app).post('/api/contact').set('Content-Type', 'application/json').send('{bad json');
    expect(res.status).toBe(400);
  });

  test('too-large body returns 413', async () => {
    const res = await request(app).post('/api/contact').send({ message: 'x'.repeat(20000) });
    expect(res.status).toBe(413);
  });

  test('server errors do not leak details', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    pool.query.mockRejectedValueOnce(new Error('secret db detail'));
    const res = await request(app).post('/api/contact').send({ name: 'A', email: 'a@b.com', message: 'hi' });
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });
});

describe('GET /api/slots', () => {
  test('hides hours that are already booked', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ hour: 9 }] });
    const res = await request(app).get(`/api/slots?date=${weekday}`);
    expect(res.status).toBe(200);
    expect(res.body.available).not.toContain(9);
    expect(res.body.available).toHaveLength(5);
  });

  test('rejects weekends', async () => {
    const res = await request(app).get(`/api/slots?date=${saturday}`);
    expect(res.status).toBe(400);
  });

  test('rejects a bad date format', async () => {
    const res = await request(app).get('/api/slots?date=tomorrow');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/bookings', () => {
  test('saves the booking and sends two emails', async () => {
    const res = await request(app).post('/api/bookings').send(goodBooking);
    expect(res.status).toBe(201);
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(2);
    const recipients = sendMail.mock.calls.map((c) => c[0].to);
    expect(recipients).toEqual(expect.arrayContaining(['team@test.com', 'maria@test.com']));
  });

  test('rejects a weekend date', async () => {
    const res = await request(app).post('/api/bookings').send({ ...goodBooking, date: saturday });
    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('rejects the lunch hour (12)', async () => {
    const res = await request(app).post('/api/bookings').send({ ...goodBooking, hour: 12 });
    expect(res.status).toBe(400);
  });

  test('rejects an invalid email', async () => {
    const res = await request(app).post('/api/bookings').send({ ...goodBooking, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  test('rejects a missing name', async () => {
    const res = await request(app).post('/api/bookings').send({ ...goodBooking, name: '   ' });
    expect(res.status).toBe(400);
  });

  test('returns 409 when the slot is already taken', async () => {
    pool.query.mockRejectedValueOnce({ code: '23505' });
    const res = await request(app).post('/api/bookings').send(goodBooking);
    expect(res.status).toBe(409);
    expect(sendMail).not.toHaveBeenCalled();
  });

  test('honeypot: bots look successful but nothing is saved or emailed', async () => {
    const res = await request(app).post('/api/bookings').send({ ...goodBooking, website: 'http://spam.com' });
    expect(res.status).toBe(201);
    expect(pool.query).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });
});

describe('POST /api/contact', () => {
  test('saves the message and sends two emails', async () => {
    const res = await request(app).post('/api/contact').send({ name: 'Juan', email: 'juan@test.com', subject: 'Hi', message: 'Hello' });
    expect(res.status).toBe(201);
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  test('rejects an empty message', async () => {
    const res = await request(app).post('/api/contact').send({ name: 'Juan', email: 'juan@test.com', message: '' });
    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('honeypot: nothing is saved or emailed', async () => {
    const res = await request(app).post('/api/contact').send({ name: 'Bot', email: 'bot@test.com', message: 'buy now', website: 'x' });
    expect(res.status).toBe(201);
    expect(pool.query).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });
});

describe('email templates', () => {
  test('user text is escaped, so HTML cannot be injected', () => {
    const mail = templates.messageNotice({
      name: '<script>alert(1)</script>',
      email: 'a@b.com',
      subject: 'x',
      message: '<img src=x onerror=alert(1)>',
    });
    expect(mail.html).not.toContain('<script>alert(1)</script>');
    expect(mail.html).not.toContain('<img src=x');
    expect(mail.html).toContain('&lt;script&gt;');
  });

  test('subject never contains line breaks', () => {
    const mail = templates.messageNotice({ name: 'A', email: 'a@b.com', subject: 'Hi\r\nBcc: x@y.com', message: 'm' });
    expect(mail.subject).not.toMatch(/[\r\n]/);
  });
});

const { sendMail, logoSrc } = require('../src/mailer');

const mail = { to: 'a@test.com', replyTo: 'r@test.com', subject: 'Hi', html: '<p>x</p>', text: 'x' };

afterEach(() => {
  delete process.env.BREVO_API_KEY;
  delete process.env.BREVO_SENDER;
  jest.restoreAllMocks();
});

describe('mailer with Brevo', () => {
  beforeEach(() => {
    process.env.BREVO_API_KEY = 'test-key';
    process.env.BREVO_SENDER = 'hello@sparksolution.test';
  });

  test('posts the email to the Brevo API', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    await sendMail(mail);
    const [url, options] = global.fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(options.headers['api-key']).toBe('test-key');
    expect(body.sender.email).toBe('hello@sparksolution.test');
    expect(body.to).toEqual([{ email: 'a@test.com' }]);
    expect(body.replyTo).toEqual({ email: 'r@test.com' });
    expect(body.htmlContent).toBe('<p>x</p>');
  });

  test('a failed API call is logged, never thrown', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'bad key' });
    await expect(sendMail(mail)).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
  });

  test('logo is loaded from the website, not attached', () => {
    expect(logoSrc()).toContain('/img/logo-mark.png');
  });
});

test('without Brevo the logo is attached inside the email', () => {
  expect(logoSrc()).toBe('cid:spark-logo');
});

const form = document.getElementById('form');
const msg = document.getElementById('msg');
const send = document.getElementById('send');

function show(kind, text) {
  msg.className = 'msg ' + kind;
  msg.textContent = text;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const message = form.message.value.trim();
  if (!name || !message) return show('err', 'Please fill in your name and message.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return show('err', 'Please enter a valid email.');

  send.disabled = true;
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, subject: form.subject.value, message, website: form.website.value }),
    });
    const data = await res.json();
    if (!res.ok) return show('err', data.error || 'Something went wrong.');
    show('ok', 'Message sent. We will reply by email.');
    form.reset();
  } catch (err) {
    show('err', 'Could not reach the server. Please try again.');
  } finally {
    send.disabled = false;
  }
});

// Navigation behaviour shared by every page: shrink on scroll, hide on scroll down,
// gliding highlight, section tracking (scrollspy) and the mobile menu.
(function () {
  const nav = document.getElementById('snav');
  if (!nav) return;
  const links = nav.querySelector('.snav-links');
  const ind = nav.querySelector('.snav-ind');
  const items = [...links.querySelectorAll('a')];
  const burger = document.getElementById('burger');
  let activeEl = null;

  // ---- gliding highlight ----
  function moveTo(el) {
    if (!el) { ind.style.opacity = '0'; return; }
    const l = links.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    ind.style.setProperty('--x', r.left - l.left + 'px');
    ind.style.setProperty('--w', r.width + 'px');
    ind.style.opacity = '1';
  }
  function setActive(el) {
    activeEl = el;
    document.querySelectorAll('.snav a').forEach((a) => {
      const same = el && a.getAttribute('href') === el.getAttribute('href');
      a.classList.toggle('is-active', Boolean(same));
    });
    moveTo(el);
  }
  items.forEach((a) => {
    a.addEventListener('mouseenter', () => moveTo(a));
    a.addEventListener('focus', () => moveTo(a));
  });
  links.addEventListener('mouseleave', () => moveTo(activeEl));

  // ---- which page / section are we on ----
  const page = items.find((a) => a.getAttribute('href') === location.pathname);
  if (page) setActive(page);

  const spyItems = items.filter((a) => a.dataset.spy);
  if (spyItems.length && 'IntersectionObserver' in window) {
    const visible = new Set();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id)));
        const current = spyItems.filter((a) => visible.has(a.dataset.spy)).pop();
        setActive(current || null);
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    spyItems.forEach((a) => {
      const sec = document.getElementById(a.dataset.spy);
      if (sec) io.observe(sec);
    });
  }

  // ---- shrink on scroll, hide when scrolling down, show when scrolling up ----
  let lastY = window.scrollY;
  let ticking = false;
  function onScroll() {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 30);
    if (!nav.classList.contains('open')) {
      if (y > lastY + 6 && y > 420) nav.classList.add('hide');
      else if (y < lastY - 6 || y <= 420) nav.classList.remove('hide');
    }
    lastY = y;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(() => { onScroll(); ticking = false; }); ticking = true; }
  }, { passive: true });
  onScroll();

  // ---- mobile menu ----
  function setOpen(open) {
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    document.documentElement.classList.toggle('no-scroll', open);
    if (open) nav.classList.remove('hide');
  }
  burger.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
  nav.querySelectorAll('.snav-m a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  window.addEventListener('resize', () => { if (window.innerWidth > 920) setOpen(false); moveTo(activeEl); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => moveTo(activeEl));
})();

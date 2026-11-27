// Home page extras: card spotlight, count-up numbers, magnetic buttons,
// hero parallax, 3D tilt and the back-to-top button.
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ---- spotlight that follows the mouse on cards ----
  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest && e.target.closest('.card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', e.clientX - r.left + 'px');
    card.style.setProperty('--my', e.clientY - r.top + 'px');
  });

  // ---- numbers that count up when they appear ----
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window && !reduce) {
    counters.forEach((el) => (el.textContent = '0'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        const el = entry.target;
        const end = Number(el.dataset.count);
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min((now - start) / 1300, 1);
          el.textContent = Math.round(end * (1 - Math.pow(1 - t, 3)));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => io.observe(el));
  } else {
    counters.forEach((el) => (el.textContent = el.dataset.count));
  }

  if (fine && !reduce) {
    // ---- magnetic buttons ----
    document.querySelectorAll('.btn-main, .btn-white, .btn-ghost, .snav-cta').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.22;
        const y = (e.clientY - r.top - r.height / 2) * 0.3;
        btn.style.setProperty('--tx', x + 'px');
        btn.style.setProperty('--ty', y + 'px');
      });
      btn.addEventListener('pointerleave', () => {
        btn.style.setProperty('--tx', '0px');
        btn.style.setProperty('--ty', '0px');
      });
    });

    // ---- hero parallax ----
    const hero = document.querySelector('.hero');
    const layers = hero ? hero.querySelectorAll('[data-depth]') : [];
    let raf = 0;
    if (hero && layers.length) {
      hero.addEventListener('pointermove', (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const nx = e.clientX / window.innerWidth - 0.5;
          const ny = e.clientY / window.innerHeight - 0.5;
          layers.forEach((l) => {
            const d = Number(l.dataset.depth);
            l.style.translate = nx * d + 'px ' + ny * d + 'px';
          });
        });
      });
      hero.addEventListener('pointerleave', () => layers.forEach((l) => (l.style.translate = '0px 0px')));
    }

    // ---- 3D tilt ----
    document.querySelectorAll('.tilt').forEach((box) => {
      const target = box.firstElementChild;
      box.addEventListener('pointermove', (e) => {
        const r = box.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        target.style.transform = 'rotateX(' + -ny * 7 + 'deg) rotateY(' + nx * 9 + 'deg)';
      });
      box.addEventListener('pointerleave', () => (target.style.transform = ''));
    });
  }

  // ---- back to top ----
  const top = document.getElementById('toTop');
  if (top) {
    window.addEventListener('scroll', () => top.classList.toggle('show', window.scrollY > 900), { passive: true });
    top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
  }
})();

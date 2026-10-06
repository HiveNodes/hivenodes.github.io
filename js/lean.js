// HiveNodes homepage: e-mail, the talking film, the formation display, and the cinematic layers. Only what the page
// needs to show its first picture loads first; every other module waits for the load event or for a screen that uses it.
const $ = s => document.querySelector(s), RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
(() => { const a = $('#mail'), u = 'nidhip.sharma.123', d = 'gmail.com'; if (a) { a.textContent = `${u}@${d}`; a.href = `mailto:${u}@${d}?subject=HiveNodes`; } })();
// the opening titles: desktop-class screens only, and they must start at once
if (matchMedia('(pointer: fine) and (min-width: 1000px)').matches) import('./intro.js').then(m => m.intro()).catch(() => {});
const afterLoad = f => { if (document.readyState === 'complete') f(); else addEventListener('load', f, { once: true }); };
afterLoad(() => {
  import('./comms.js').then(m => m.startComms({ RM })).catch(() => {});
  if (matchMedia('(pointer: fine)').matches) import('./holo.js').then(m => m.holo()).catch(() => {});
  (window.requestIdleCallback || setTimeout)(() => import('./field.js').then(m => m.field()).catch(() => {}), { timeout: 2500 });
});
(() => { const fx = $('#fx'); if (!fx) return; const go = () => import('./formations.js').then(m => m.startFormations(fx)).catch(() => {});
  if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: '300px 0px' }); io.observe(fx); } else go(); })();
// the numbers count up once, when they first come into view (the page's own text is the final value)
(() => { if (RM || !('IntersectionObserver' in window)) return;
  const els = [...document.querySelectorAll('.nums dd')].filter(e => /^\d+$/.test(e.textContent.trim()));
  const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; io.unobserve(e.target);
    const el = e.target, end = +el.textContent.trim(), t0 = performance.now(), D = 1400;
    if (!end) return; const f = now => { const u = Math.min(1, (now - t0) / D), k = 1 - Math.pow(1 - u, 3); el.textContent = String(Math.round(end * k)); if (u < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }), { threshold: .6 });
  els.forEach(e => io.observe(e)); })();

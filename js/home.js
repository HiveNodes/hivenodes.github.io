// HiveNodes homepage: film control, reveal on scroll, and the e-mail address assembled here
// so it is not sitting in the HTML for scrapers. Nothing else runs.
document.documentElement.classList.add('js');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// e-mail
(() => { const a = $('#mail'), u = 'nidhip.sharma.123', d = 'gmail.com'; if (a) { a.textContent = `${u}@${d}`; a.href = `mailto:${u}@${d}?subject=HiveNodes`; } })();

// the mission, step by step
import('./story.js').then(m => m.startStory()).catch(() => {});

// live display: the real engine, fetched only when near, never by itself on a slow or Save-Data link
(() => {
  const root = $('#live'); if (!root) return;
  const btns = $$('[data-lv]', root).filter(b => b.dataset.lv !== 'start'), startB = $('[data-lv="start"]', root);
  if (!('WebAssembly' in window) || !('Worker' in window)) { $('#lv-log').textContent = 'This browser cannot run the live engine; the simulation page has a recorded version.'; return; }
  const c = navigator.connection || {}, slow = c.saveData || /(^|-)2g|3g/.test(c.effectiveType || '');
  let started = false;
  const go = () => { if (started) return; started = true; startB.hidden = true; $('#lv-log').textContent = 'Starting the engine…';
    import('./live.js').then(m => { m.startLiveDisplay(root); btns.forEach(b => { b.disabled = false; }); }).catch(() => { $('#lv-log').textContent = 'The live engine could not start.'; }); };
  if (slow) { startB.hidden = false; startB.addEventListener('click', go); $('#lv-log').textContent = 'Paused to save your data. Start it when you like.'; return; }
  if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: '300px 0px' }); io.observe(root); } else go();
})();

// formation morph, loaded only when its section is near
(() => {
  const fx = $('#fx'); if (!fx) return;
  const go = () => import('./formations.js').then(m => m.startFormations(fx)).catch(() => {});
  if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: '400px 0px' }); io.observe(fx); } else go();
})();

// Pangong Tso, now: local time and the real sun angle there, computed here (NOAA solar position
// equations). No network, no fake data: it is simply what the sky over the lake is doing right now.
(() => {
  const el = $('#sunline'); if (!el) return;
  const LAT = 33.9006, LON = 78.4936, rad = Math.PI / 180;
  const sun = d => {
    const jd = d.getTime() / 864e5 + 2440587.5, T = (jd - 2451545) / 36525;
    const L0 = (280.46646 + T * (36000.76983 + T * .0003032)) % 360, M = 357.52911 + T * (35999.05029 - .0001537 * T);
    const e = .016708634 - T * (.000042037 + .0000001267 * T);
    const C = Math.sin(M * rad) * (1.914602 - T * (.004817 + .000014 * T)) + Math.sin(2 * M * rad) * (.019993 - .000101 * T) + Math.sin(3 * M * rad) * .000289;
    const lam = L0 + C - .00569 - .00478 * Math.sin((125.04 - 1934.136 * T) * rad);
    const eps = 23 + (26 + (21.448 - T * (46.815 + T * (.00059 - T * .001813))) / 60) / 60 + .00256 * Math.cos((125.04 - 1934.136 * T) * rad);
    const dec = Math.asin(Math.sin(eps * rad) * Math.sin(lam * rad));
    const y = Math.tan(eps / 2 * rad) ** 2;
    const eqt = 4 / rad * (y * Math.sin(2 * L0 * rad) - 2 * e * Math.sin(M * rad) + 4 * e * y * Math.sin(M * rad) * Math.cos(2 * L0 * rad) - .5 * y * y * Math.sin(4 * L0 * rad) - 1.25 * e * e * Math.sin(2 * M * rad));
    const utcMin = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
    const ha = ((utcMin + eqt + 4 * LON) / 4 - 180) * rad;
    const el = Math.asin(Math.sin(LAT * rad) * Math.sin(dec) + Math.cos(LAT * rad) * Math.cos(dec) * Math.cos(ha)) / rad;
    return el;
  };
  const fmtDur = m => m >= 60 ? `${Math.floor(m / 60)} h ${Math.round(m % 60)} min` : `${Math.round(m)} min`;
  const update = () => {
    const now = new Date(), e = sun(now), up = e > -.833;
    let m = 0; while (m < 1440 && (sun(new Date(now.getTime() + (m + 1) * 6e4)) > -.833) === up) m++;   // minutes to the next sunrise or sunset
    const t = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
    el.textContent = `Pangong Tso, Ladakh, now \u00b7 ${t} \u00b7 sun ${Math.abs(Math.round(e))}\u00b0 ${e >= 0 ? 'above' : 'below'} the horizon \u00b7 ${up ? 'sunset' : 'sunrise'} in ${fmtDur(m)}`;
  };
  update(); setInterval(update, 30000);
})();

// Proof: the three numbers count up once, together, when they arrive. The page's HTML holds the real
// values (the figure checks read those); this only animates their arrival.
(() => {
  const dds = $$('.proof .nums3 dd'); if (!dds.length || RM || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(es => {
    if (!es.some(e => e.isIntersecting)) return; io.disconnect();
    const targets = dds.map(d => ({ d, v: parseInt(d.textContent.replace(/\D/g, ''), 10) || 0, txt: d.textContent }));
    const t0 = performance.now(), D = 1600;
    const tick = now => { const u = Math.min(1, (now - t0) / D), k = 1 - Math.pow(1 - u, 3);
      targets.forEach(({ d, v, txt }) => { d.textContent = u < 1 ? String(Math.round(v * k)) : txt; });
      if (u < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }, { threshold: .5 });
  io.observe(dds[0]);
})();

// optional sound bed, generated in the browser; never starts by itself
(() => {
  const b = $('#snd'); if (!b || !(window.AudioContext || window.webkitAudioContext)) { if (b) b.hidden = true; return; }
  b.addEventListener('click', () => { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on));
    import('./sound.js').then(m => m.toggleSound(on)).catch(() => { b.hidden = true; }); });
})();

// reveal blocks as they arrive (content is visible without JS: the class is only added here)
(() => {
  const els = $$('.sec .w > *, .prod, .cap, .fm-grid figure, .shots figure, .steps li, .three li, .ms-grid li, .parts li');
  if (RM || !('IntersectionObserver' in window)) return;
  els.forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach(el => io.observe(el));
})();

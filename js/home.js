// HiveNodes homepage: film control, reveal on scroll, and the e-mail address assembled here
// so it is not sitting in the HTML for scrapers. Nothing else runs.
document.documentElement.classList.add('js');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// e-mail
(() => { const a = $('#mail'), u = 'nidhip.sharma.123', d = 'gmail.com'; if (a) { a.textContent = `${u}@${d}`; a.href = `mailto:${u}@${d}?subject=HiveNodes`; } })();

// film: plays muted; pauses when off screen or when the visitor asks; never autoplays under reduced motion
(() => {
  const v = $('#herov'), b = $('#film-toggle'); if (!v || !b) return;
  let userPaused = false;
  const setBtn = () => { b.textContent = v.paused ? 'Play film' : 'Pause film'; b.setAttribute('aria-pressed', String(!v.paused)); };
  v.addEventListener('play', setBtn); v.addEventListener('pause', setBtn);
  b.addEventListener('click', () => { if (v.paused) { userPaused = false; v.play().catch(() => {}); } else { userPaused = true; v.pause(); } });
  if (RM) { v.removeAttribute('autoplay'); v.pause(); userPaused = true; }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { for (const e of es) { if (userPaused) return; if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); } }).observe(v);
  }
  setBtn();
})();

// the mission, step by step
import('./story.js').then(m => m.startStory()).catch(() => {});

// formation morph, loaded only when its section is near
(() => {
  const fx = $('#fx'); if (!fx) return;
  const go = () => import('./formations.js').then(m => m.startFormations(fx)).catch(() => {});
  if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: '400px 0px' }); io.observe(fx); } else go();
})();

// reveal blocks as they arrive (content is visible without JS: the class is only added here)
(() => {
  const els = $$('.sec .w > *, .prod, .cap, .fm-grid figure, .shots figure, .steps li, .three li, .ms-grid li, .parts li');
  if (RM || !('IntersectionObserver' in window)) return;
  els.forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach(el => io.observe(el));
})();

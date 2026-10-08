// HiveNodes homepage: e-mail, the mission briefing, the formation display. Only what the first picture needs loads
// first; the briefing's film and overlay start after the page's load event.
document.documentElement.classList.add('js');
const $ = s => document.querySelector(s), RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
(() => { const a = $('#mail'), u = 'nidhip.sharma.123', d = 'gmail.com'; if (a) { a.textContent = `${u}@${d}`; a.href = `mailto:${u}@${d}?subject=HiveNodes`; } })();
const afterLoad = f => { if (document.readyState === 'complete') f(); else addEventListener('load', f, { once: true }); };
afterLoad(() => import('./cinema.js').then(m => m.startCinema({ RM })).catch(e => console.error(e)));
import('./shots.js').then(m => m.startShots({ RM })).catch(() => {});
(() => { const fx = $('#fx'); if (!fx) return; const go = () => import('./formations.js').then(m => m.startFormations(fx)).catch(() => {});
  if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: '300px 0px' }); io.observe(fx); } else go(); })();

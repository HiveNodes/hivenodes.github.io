// HiveNodes simulation page: the live mission and the evidence table, on their own page.
// The simulator itself is js/mission.js (unchanged); this file only provides what it needs from a page:
// a visibility watcher, a sound cue, and lazy start when the rig is near the viewport.
document.documentElement.classList.add('js');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const watchers = [];
export function watch(el, fn, once) { if (el) watchers.push({ el, fn, once, last: null, done: false }); }
function checkViews() {
  const h = innerHeight;
  for (const w of watchers) {
    if (w.done) continue;
    const r = w.el.getBoundingClientRect();
    if (w.once) { if (r.top < h * .92 && r.bottom > 0) { w.done = true; w.fn(true); } }
    else { const vis = r.top < h && r.bottom > 0; if (vis !== w.last) { w.last = vis; w.fn(vis); } }
  }
}
let queued = false;
const queue = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; checkViews(); }); };
addEventListener('scroll', queue, { passive: true });
addEventListener('resize', queue);
$$('.rv').forEach(x => watch(x, () => x.classList.add('in'), true));
$$('.sec').forEach(s => watch(s, () => s.classList.add('arrived'), true));

let actx = null;
const snd = $('#snd');
snd.addEventListener('click', () => {
  const on = snd.getAttribute('aria-pressed') !== 'true';
  snd.setAttribute('aria-pressed', String(on)); snd.textContent = on ? 'Sound on' : 'Sound off';
  if (on && !actx) { try { actx = new AudioContext(); } catch { actx = null; } }
});
export function cue(kind) {
  if (!actx || snd.getAttribute('aria-pressed') !== 'true') return;
  const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
  if (kind === 'impact') { o.type = 'sine'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(34, t + .45); g.gain.setValueAtTime(.5, t); g.gain.exponentialRampToValueAtTime(.001, t + .5); }
  else { o.type = 'square'; o.frequency.setValueAtTime(kind === 'good' ? 1320 : 880, t); g.gain.setValueAtTime(.035, t); g.gain.exponentialRampToValueAtTime(.001, t + .05); }
  o.connect(g).connect(actx.destination); o.start(t); o.stop(t + .55);
}

(() => {
  const rig = $('#rig'); let started = false;
  const start = () => {
    if (started) return; started = true;
    if (!('WebAssembly' in window) || !('Worker' in window)) { $('#rig-fallback').hidden = false; $('.rig-body').hidden = true; $('.tools').hidden = true; return; }
    import('./mission.js').then(m => m.startLive({ watch, cue, RM })).catch(() => { $('#rig-fallback').hidden = false; });
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); start(); } }, { rootMargin: '600px 0px' });
    io.observe(rig);
  } else start();
})();

checkViews(); setTimeout(checkViews, 150);

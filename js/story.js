// HiveNodes homepage: the mission told step by step. The section is tall; its stage stays pinned while
// you scroll, and each step of the scroll is one chapter of the film, its words in the bar beneath.
// Bandwidth first: the stills (about 60 KB each) always work; the film (3.4 MB AV1) is fetched only
// when the section is near, the connection is not slow, and Save-Data is off. Reduced motion: stills.
const $ = s => document.querySelector(s);

export function startStory() {
  const sec = $('#mission'), v = $('#story-v'), still = $('#story-still'), capN = $('#cap-n'), capT = $('#cap-t'), ticks = $('#ticks');
  if (!sec || !still) return;
  const steps = [...sec.querySelectorAll('.chapters li')].map(li => ({
    t0: +li.dataset.t0, t1: +li.dataset.t1, still: li.dataset.still,
    text: li.textContent.replace(/^\s*[^.]+\.\s*/, '').trim(),
  }));
  steps.forEach(() => ticks.appendChild(document.createElement('i')));
  const tickEls = [...ticks.children];

  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const c = navigator.connection || {};
  const slow = c.saveData || /(^|-)2g|3g/.test(c.effectiveType || '');
  let film = false, cur = -1;

  // preload the stills quietly after the page is up (small, and they are the fallback for everything)
  const pre = () => steps.forEach(s => { const i = new Image(); i.decoding = 'async'; i.src = stillSrc(s.still); });
  const stillSrc = n => `media/cine/${n}_${innerWidth * (devicePixelRatio || 1) > 1000 ? 1600 : 800}.webp`;
  ('requestIdleCallback' in window ? requestIdleCallback : setTimeout)(pre, 2000);

  const loadFilm = () => {
    if (film || slow || RM || !v) return; film = true;
    v.querySelectorAll('source').forEach(s => { s.src = s.dataset.src; });
    v.preload = 'auto'; v.load();
    v.addEventListener('canplay', () => { v.classList.add('on'); seek(true); }, { once: true });
    v.addEventListener('timeupdate', () => { const s = steps[cur]; if (s && v.currentTime >= s.t1 - .05) v.currentTime = s.t0; });
  };
  const seek = force => {
    const s = steps[cur]; if (!s || !film || v.readyState < 1) return;
    if (force || v.currentTime < s.t0 || v.currentTime > s.t1) v.currentTime = s.t0;
    if (v.paused) v.play().catch(() => {});
  };

  const show = i => {
    if (i === cur) return; cur = i; const s = steps[i];
    capN.textContent = String(i + 1).padStart(2, '0');
    capT.textContent = s.text;
    tickEls.forEach((t, j) => t.classList.toggle('on', j <= i));
    if (!v.classList.contains('on')) { still.style.opacity = '.35'; setTimeout(() => { still.src = stillSrc(s.still); still.srcset = ''; still.style.opacity = '1'; }, RM ? 0 : 180); }
    seek(true);
  };

  let queued = false;
  const onScroll = () => {
    queued = false;
    const r = sec.getBoundingClientRect(), span = r.height - innerHeight;
    const p = Math.min(Math.max(-r.top / Math.max(span, 1), 0), .9999);
    show(Math.floor(p * steps.length));
    const near = r.top < innerHeight * 1.5 && r.bottom > -innerHeight;
    if (near) loadFilm();
    if (film) { if (r.top < innerHeight && r.bottom > 0) { if (v.paused) v.play().catch(() => {}); } else v.pause(); }
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();
}

// HiveNodes homepage. Everything here shows real state or is labelled as a model:
//  - the film is drawn from ONE hidden <video> into whichever plate is on screen, through a small WebGL pass
//    (grain, vignette, edge chromatic aberration). The Eyes readout beside it follows the film's own beats.
//  - the live mission is js/mission.js (unchanged), the Scattrnodes core in a worker.
//  - the clock and sun line are computed for Pangong Tso; the engine sha is read from sim/provenance.json;
//    the recount line is read from figures.json, written by the publish gate.
document.documentElement.classList.add('js');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const conn = navigator.connection || {};
const SLOW = !!(conn.saveData || /(^|-)2g|3g/.test(conn.effectiveType || ''));
// The published film still carries the old sensor reticle after 0:40; until the v5 film replaces it,
// nothing after 0:40 is shown (the last beats hold stills instead).
const FILM_END = 40;

// ---------- e-mail, assembled here so it is not sitting in the HTML for scrapers
(() => { const a = $('#mail'), u = 'nidhip.sharma.123', d = 'gmail.com'; if (a) { a.textContent = `${u}@${d}`; a.href = `mailto:${u}@${d}?subject=HiveNodes`; } })();

// ---------- Pangong Tso: clock and sun (NOAA solar position equations, no network)
(() => {
  const LAT = 33.9006, LON = 78.4936, rad = Math.PI / 180, clk = $('#clock'), line = $('#sunline');
  const sun = d => {
    const jd = d.getTime() / 864e5 + 2440587.5, T = (jd - 2451545) / 36525;
    const L0 = (280.46646 + T * (36000.76983 + T * .0003032)) % 360, M = 357.52911 + T * (35999.05029 - .0001537 * T);
    const e = .016708634 - T * (.000042037 + .0000001267 * T);
    const C = Math.sin(M * rad) * (1.914602 - T * (.004817 + .000014 * T)) + Math.sin(2 * M * rad) * (.019993 - .000101 * T) + Math.sin(3 * M * rad) * .000289;
    const om = 125.04 - 1934.136 * T, lam = L0 + C - .00569 - .00478 * Math.sin(om * rad);
    const eps = 23 + (26 + (21.448 - T * (46.815 + T * (.00059 - T * .001813))) / 60) / 60 + .00256 * Math.cos(om * rad);
    const dec = Math.asin(Math.sin(eps * rad) * Math.sin(lam * rad)), y = Math.tan(eps / 2 * rad) ** 2;
    const eqt = 4 / rad * (y * Math.sin(2 * L0 * rad) - 2 * e * Math.sin(M * rad) + 4 * e * y * Math.sin(M * rad) * Math.cos(2 * L0 * rad) - .5 * y * y * Math.sin(4 * L0 * rad) - 1.25 * e * e * Math.sin(2 * M * rad));
    const ha = ((d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60 + eqt + 4 * LON) / 4 - 180) * rad;
    return Math.asin(Math.sin(LAT * rad) * Math.sin(dec) + Math.cos(LAT * rad) * Math.cos(dec) * Math.cos(ha)) / rad;
  };
  const dur = m => m >= 60 ? `${Math.floor(m / 60)} h ${Math.round(m % 60)} min` : `${Math.round(m)} min`;
  const tick = () => {
    const now = new Date(), t = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
    if (clk) clk.textContent = t;
    if (line) { const el = sun(now), up = el > -.833, on = k => (sun(new Date(now.getTime() + k * 6e4)) > -.833) === up;
      let m = 0; while (m < 1440 && on(m + 10)) m += 10; while (m < 1440 && on(m + 1)) m++;   // 10-minute steps, then the minute
      line.textContent = `Pangong Tso, Ladakh, now · ${t} · sun ${Math.abs(Math.round(el))}° ${el >= 0 ? 'above' : 'below'} the horizon · ${up ? 'sunset' : 'sunrise'} in ${dur(m)}`; }
  };
  tick(); setInterval(tick, 30000);
})();

// ---------- provenance and recount, read from files the build wrote (never hard-coded)
fetch('sim/provenance.json').then(r => r.ok ? r.json() : null).then(p => { if (p && p.product_sha) $('#eng-sha').textContent = p.product_sha.slice(0, 7); }).catch(() => {});
fetch('figures.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(f => {
  const st = $('#rc-state'), src = $('#rc-src'); if (!st) return;
  if (!f) { st.textContent = 'recount record not published with this build'; st.className = 'bad'; return; }
  st.textContent = f.ok ? `recounted ✓ ${f.date}` : `recount FAILED ${f.date}`; st.className = f.ok ? 'ok' : 'bad';
  src.textContent = `from Scattrnodes ${String(f.repo_sha || '').slice(0, 7)} · ${f.checked} figures`;
}).catch(() => {});

// ---------- the film: one video, one post pass, drawn into the plate that is on screen
const film = $('#film');
const BEATS = [ // what the film shows, by time (s); the readout and the page exposure follow these
  { t: 0, uav: 70, gs: '6 · 4', gps: 'OK', radio: 'NOMINAL', relays: 0, lost: 0, exp: 1 },
  { t: 17, gps: 'DENIED', exp: .84 },
  { t: 23, radio: 'DEGRADED', relays: 4, exp: .84 },
  { t: 28.5, uav: 69, lost: 1, exp: .92 },
  { t: 34, exp: 1 },
];
const stateAt = t => { const s = {}; for (const b of BEATS) if (t >= b.t) Object.assign(s, b); return s; };
const setTelem = (root, t) => {
  const s = stateAt(t);
  for (const dd of $$('[data-t]', root)) { const v = String(s[dd.dataset.t]); if (dd.textContent !== v) dd.textContent = v; dd.classList.toggle('lost', dd.dataset.t === 'lost' && s.lost > 0); }
  document.documentElement.style.setProperty('--exposure', String(s.exp));
};

function makePass(cv) {
  // WebGL2 post pass; returns draw(video, time) or null when WebGL2 is not available
  const gl = cv.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: false }); if (!gl) return null;
  const vs = `#version 300 es
in vec2 p; out vec2 uv; void main(){ uv = p * .5 + .5; uv.y = 1. - uv.y; gl_Position = vec4(p, 0., 1.); }`;
  const fs = `#version 300 es
precision highp float; in vec2 uv; out vec4 o; uniform sampler2D v; uniform vec2 sc, off; uniform float tm, ex;
float h(vec2 q){ return fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 q = uv * sc + off; vec2 d = uv - .5; float r2 = dot(d, d);
  vec3 c = vec3(texture(v, q + d * .0016 * r2 * 4.).r, texture(v, q).g, texture(v, q - d * .0016 * r2 * 4.).b);   // edge CA
  c *= 1. - .32 * smoothstep(.12, .62, r2);                                                                      // vignette
  float l = dot(c, vec3(.299, .587, .114));
  c += (h(gl_FragCoord.xy + fract(tm) * 917.) - .5) * .045 * (.35 + 2.6 * l * (1. - l));                         // grain, per frame
  o = vec4(c * ex, 1.);
}`;
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
  gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const U = n => gl.getUniformLocation(pr, n), uSc = U('sc'), uOff = U('off'), uTm = U('tm'), uEx = U('ex');
  return (video, t) => {
    const r = cv.getBoundingClientRect(), dp = Math.min(devicePixelRatio || 1, 2), W = Math.round(r.width * dp), H = Math.round(r.height * dp);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    gl.viewport(0, 0, W, H);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    const va = video.videoWidth / video.videoHeight, ca = W / H;            // object-fit: cover
    const sx = ca > va ? 1 : ca / va, sy = ca > va ? va / ca : 1;
    gl.uniform2f(uSc, sx, sy); gl.uniform2f(uOff, (1 - sx) / 2, (1 - sy) / 2); gl.uniform1f(uTm, t); gl.uniform1f(uEx, 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
}
function make2d(cv) {
  const ctx = cv.getContext('2d');
  return video => { const r = cv.getBoundingClientRect(), W = cv.width = Math.round(r.width), H = cv.height = Math.round(r.height);
    const va = video.videoWidth / video.videoHeight, ca = W / H, w = ca > va ? W : H * va, h = ca > va ? W / va : H; ctx.drawImage(video, (W - w) / 2, (H - h) / 2, w, h); };
}

const plates = {
  walk: { cv: $('#walk-cv'), telem: $('#walk-telem'), seg: [0, 11], visible: false, draw: null, stillOnly: false },
};
let filmLoaded = false, active = null;
function loadFilm() {
  if (filmLoaded || SLOW || RM || !film) return; filmLoaded = true;
  $$('source', film).forEach(s => { s.src = s.dataset.src; }); film.preload = 'auto'; film.load();
  for (const p of Object.values(plates)) p.draw = makePass(p.cv) || make2d(p.cv);
  film.addEventListener('canplay', () => pick(), { once: true });
  film.addEventListener('timeupdate', () => { const p = active && plates[active]; if (p && (film.currentTime >= p.seg[1] - .05 || film.currentTime < p.seg[0] - .5)) film.currentTime = p.seg[0]; });
  requestAnimationFrame(frame);
}
function pick() {
  const next = plates.walk.visible ? 'walk' : null;
  if (next !== active) { active = next; if (active) { const p = plates[active]; if (film.currentTime < p.seg[0] || film.currentTime > p.seg[1]) film.currentTime = p.seg[0]; } }
  for (const [k, p] of Object.entries(plates)) { const on = k === active && film.readyState >= 2 && !p.stillOnly; p.cv.classList.toggle('on', on); p.cv.parentElement.classList.toggle('filmon', on); }
  if (active && !plates[active].stillOnly) { film.play().catch(() => {}); } else film.pause();
}
let lastFrameT = -1;
function frame(now) {
  requestAnimationFrame(frame);
  const p = active && plates[active]; if (!p || film.readyState < 2 || p.stillOnly) return;
  if (film.currentTime >= p.seg[1] - 1 / 24) { film.currentTime = p.seg[0]; return; }     // loop the segment before the next shot shows
  if (film.currentTime === lastFrameT) return;                                          // a 24 fps film: upload only new frames
  lastFrameT = film.currentTime; p.draw(film, now / 1000); setTelem(p.telem, film.currentTime);
}
if ('IntersectionObserver' in window) {
  let ready = false; const idle = window.requestIdleCallback || (f => setTimeout(f, 1));
  addEventListener('load', () => setTimeout(() => idle(() => { ready = true; if (Object.values(plates).some(p => p.visible)) loadFilm(); }), 1500));
  for (const [k, p] of Object.entries(plates)) new IntersectionObserver(es => { p.visible = es.some(e => e.isIntersecting); if (p.visible && ready) loadFilm(); if (filmLoaded) pick(); }, { threshold: .15 }).observe(p.cv.parentElement);
}
// hero: the ops display over real imagery; its timeline drives the readout and the chapter rail
const CUES = [0, 6, 11, 17, 23, 28.5, 34, 40];
let ops = null;
const railAt = t => { let i = 0; CUES.forEach((c, j) => { if (t >= c) i = j; }); $$('.rail [data-cue]').forEach((x, j) => x.setAttribute('aria-current', String(j === i))); };
let lastRail = -1;
(() => {
  const cv = $('#hero-cv'); if (!cv || !cv.getContext) return;
  const go = () => import('./opsmap.js').then(m => m.startOpsMap({ cv, RM, onTime: t => { setTelem($('#hero-telem'), t); const s = Math.floor(t); if (s !== lastRail) { lastRail = s; railAt(t); } } }))
    .then(o => { ops = o; }).catch(() => {});
  const idle = window.requestIdleCallback || (f => setTimeout(f, 1));
  const later = () => setTimeout(() => idle(go, { timeout: 2500 }), 1200);   // after the page is up and quiet
  if (document.readyState === 'complete') later(); else addEventListener('load', later);
})();
$$('.rail [data-cue]').forEach(b => b.addEventListener('click', () => { const t = CUES[+b.dataset.cue]; railAt(t); setTelem($('#hero-telem'), t); if (ops) ops.seek(t); }));

// ---------- the mission, pinned: scroll position picks the beat
(() => {
  const walk = $('#walk'); if (!walk) return;
  const beats = $$('.beats li', walk).map(li => ({ t0: +li.dataset.t0, t1: +li.dataset.t1, clock: li.dataset.clock, still: li.dataset.still,
    stillOnly: li.dataset.stillOnly === '1' || +li.dataset.t1 > FILM_END, h: $('h3', li).textContent, p: $('p', li).textContent }));
  const card = $('#beat-card'), still = $('#walk-still'); let cur = -1;
  const big = () => innerWidth * (devicePixelRatio || 1) > 1000 ? 1600 : 800;
  const show = i => {
    if (i === cur) return; cur = i; const b = beats[i];
    $('#beat-clock').textContent = `Step ${i + 1} of ${beats.length} · ${b.clock}`; $('#beat-h').textContent = b.h; $('#beat-p').textContent = b.p;
    if (!RM && card.animate) card.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 550, easing: 'cubic-bezier(.16,.84,.24,1)' });
    still.src = `media/cine/${b.still}_${big()}.webp`; still.srcset = '';
    plates.walk.seg = [b.t0, Math.min(b.t1, FILM_END)]; plates.walk.stillOnly = b.stillOnly;
    setTelem(plates.walk.telem, b.t0);
    if (filmLoaded) { if (active === 'walk') film.currentTime = b.t0; pick(); }
  };
  let q = false;
  const on = () => { q = false; const r = walk.getBoundingClientRect(), span = r.height - innerHeight;
    if (span <= 0) return show(0);
    show(Math.min(beats.length - 1, Math.floor(Math.min(Math.max(-r.top / span, 0), .9999) * beats.length))); };
  addEventListener('scroll', () => { if (!q) { q = true; requestAnimationFrame(on); } }, { passive: true });
  addEventListener('resize', on); on();
})();

// ---------- how they fly: the formation morph, loaded when near
(() => { const fx = $('#fx'); if (!fx) return; const go = () => import('./formations.js').then(m => m.startFormations(fx)).catch(() => {});
  if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: '300px 0px' }); io.observe(fx); } else go(); })();

// ---------- problem: three small deterministic models, drawn only while visible
(() => {
  const draw = {
    jam(ctx, W, H, t) {               // received GNSS power vs a 10 W jammer as the vehicle approaches it
      ctx.strokeStyle = 'rgba(230,234,238,.12)'; ctx.lineWidth = 1; for (let i = 1; i < 6; i++) { const y = H * i / 6; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      const gnss = H * .62; ctx.strokeStyle = '#cfe9ff'; ctx.beginPath(); ctx.moveTo(0, gnss); ctx.lineTo(W, gnss); ctx.stroke();
      ctx.strokeStyle = '#f2b544'; ctx.beginPath();
      for (let x = 0; x <= W; x += 4) { const km = 40 * (1 - x / W) + .3; const dbm = 10 * Math.log10(10 / (4 * Math.PI * (km * 1000) ** 2 / .0036)); const y = H * (1 - (dbm + 160) / 110); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      const px = ((t * .06) % 1) * W; ctx.fillStyle = '#e6eaee'; ctx.fillRect(px - 1, 0, 2, H);
      ctx.font = '20px "IBM Plex Mono", monospace'; ctx.fillStyle = '#8d97a1'; ctx.fillText('satellite signal', 14, gnss - 12); ctx.fillStyle = '#f2b544'; ctx.fillText('jammer at the receiver', 14, 30);
    },
    spoof(ctx, W, H, t) {             // true track vs a spoofed fix pulling away at 1.5 m/s while the receiver stays confident
      ctx.strokeStyle = 'rgba(230,234,238,.12)'; for (let i = 1; i < 8; i++) { const x = W * i / 8; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      const k = (t * .08) % 1, n = Math.floor(k * 120);
      ctx.strokeStyle = '#cfe9ff'; ctx.beginPath(); for (let i = 0; i <= n; i++) { const x = W * .06 + i * W * .0075, y = H * .5 + Math.sin(i * .05) * 8; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
      ctx.strokeStyle = '#f2b544'; ctx.beginPath(); for (let i = 0; i <= n; i++) { const x = W * .06 + i * W * .0075, y = H * .5 + Math.sin(i * .05) * 8 - (i * i) * .006; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
      const x = W * .06 + n * W * .0075, y = H * .5 + Math.sin(n * .05) * 8 - n * n * .006; ctx.strokeStyle = 'rgba(242,181,68,.6)'; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.stroke();
      ctx.font = '20px "IBM Plex Mono", monospace'; ctx.fillStyle = '#8d97a1'; ctx.fillText('true track', 14, H - 16); ctx.fillStyle = '#f2b544'; ctx.fillText('spoofed fix (confident, wrong)', 14, 30);
    },
    links(ctx, W, H, t) {             // a 12-node mesh losing links one by one, seeded
      const N = 12, pts = []; let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < N; i++) pts.push([W * (.1 + .8 * rnd()), H * (.15 + .7 * rnd())]);
      const edges = []; for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]); if (d < W * .3) edges.push([i, j, rnd()]); }
      const cut = (t * .09) % 1.25;
      for (const [i, j, r] of edges) { const alive = r > cut; ctx.strokeStyle = alive ? 'rgba(207,233,255,.55)' : 'rgba(242,181,68,.18)'; ctx.setLineDash(alive ? [] : [3, 4]); ctx.beginPath(); ctx.moveTo(...pts[i]); ctx.lineTo(...pts[j]); ctx.stroke(); }
      ctx.setLineDash([]); ctx.fillStyle = '#e6eaee'; for (const [x, y] of pts) { ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill(); }
      ctx.font = '20px "IBM Plex Mono", monospace'; ctx.fillStyle = '#8d97a1'; ctx.fillText(`links up ${edges.filter(e => e[2] > cut).length} / ${edges.length}`, 14, 30);
    },
  };
  for (const cv of $$('canvas[data-model]')) {
    const ctx = cv.getContext('2d'), fn = draw[cv.dataset.model]; let vis = false;
    const paint = ms => { const W = cv.width, H = cv.height; ctx.fillStyle = '#090b0e'; ctx.fillRect(0, 0, W, H); fn(ctx, W, H, RM ? 11 : ms / 1000); };
    // runs once when it arrives (about 9 s), then holds its end state; hovering replays it
    let t0 = 0; const RUN = 9000;
    const loop = now => { if (!vis) return; const e = now - t0; paint(Math.min(e, RUN) + 2000); if (e < RUN) requestAnimationFrame(loop); else vis = false; };
    const play = () => { if (vis || RM) return; vis = true; t0 = performance.now(); requestAnimationFrame(loop); };
    paint(RUN + 2000);
    if (!RM && 'IntersectionObserver' in window) { let once = false; new IntersectionObserver(es => { if (!once && es.some(e => e.isIntersecting)) { once = true; play(); } }, { threshold: .5 }).observe(cv); }
    cv.parentElement.addEventListener('pointerenter', play);
  }
})();

// ---------- headings resolve once: a 2-3 frame mono scramble into the final glyphs, on first arrival
(() => {
  const hs = $$('.scr'); if (RM || !('IntersectionObserver' in window)) return;
  const GL = 'ABCDEFGHKLMNPRSTUVWXYZ0123456789';
  const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; io.unobserve(e.target);
    const el = e.target, final = el.textContent, t0 = performance.now(), D = 420;
    el.setAttribute('aria-label', final);                       // screen readers hear the final text throughout
    const step = now => { const k = Math.min(1, (now - t0) / D), n = Math.floor(final.length * (1 - Math.pow(1 - k, 3)));
      el.textContent = [...final].map((c, i) => (i < n || c === ' ' || i >= n + 3) ? c : GL[(Math.random() * GL.length) | 0]).join('');
      if (k < 1) requestAnimationFrame(step); else { el.textContent = final; el.removeAttribute('aria-label'); } };
    requestAnimationFrame(step); }), { threshold: .6 });
  hs.forEach(h => io.observe(h));
})();

// ---------- sound: a bed made in the browser plus the console's cues; nothing plays until asked
const snd = $('#snd'); let actx = null;
snd.addEventListener('click', () => {
  const on = snd.getAttribute('aria-pressed') !== 'true'; snd.setAttribute('aria-pressed', String(on));
  if (on && !actx) { try { actx = new AudioContext(); } catch { actx = null; } }
  import('./sound.js').then(m => m.toggleSound(on)).catch(() => {});
});
function cue(kind) {
  if (!actx || snd.getAttribute('aria-pressed') !== 'true') return;
  const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
  if (kind === 'impact') { o.type = 'sine'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(34, t + .45); g.gain.setValueAtTime(.4, t); g.gain.exponentialRampToValueAtTime(.001, t + .5); }
  else { o.type = 'square'; o.frequency.setValueAtTime(kind === 'good' ? 1320 : 880, t); g.gain.setValueAtTime(.03, t); g.gain.exponentialRampToValueAtTime(.001, t + .05); }
  o.connect(g).connect(actx.destination); o.start(t); o.stop(t + .55);
}

// ---------- the live mission: js/mission.js, unchanged, started when the rig is near
const watchers = [];
function watch(el, fn, once) { if (el) watchers.push({ el, fn, once, last: null, done: false }); }
function checkViews() {
  const h = innerHeight;
  for (const w of watchers) { if (w.done) continue; const r = w.el.getBoundingClientRect();
    if (w.once) { if (r.top < h * .92 && r.bottom > 0) { w.done = true; w.fn(true); } }
    else { const vis = r.top < h && r.bottom > 0; if (vis !== w.last) { w.last = vis; w.fn(vis); } } }
}
let vq = false; const vqueue = () => { if (vq) return; vq = true; requestAnimationFrame(() => { vq = false; checkViews(); }); };
addEventListener('scroll', vqueue, { passive: true }); addEventListener('resize', vqueue);
$$('.rv').forEach(x => watch(x, () => x.classList.add('in'), true));
(() => {
  const rig = $('#rig'); if (!rig) return; let started = false;
  const start = () => { if (started) return; started = true;
    if (!('WebAssembly' in window) || !('Worker' in window)) { const fb = $('#rig-fallback'); if (fb) fb.hidden = false; return; }
    import('./mission.js').then(m => m.startLive({ watch, cue, RM })).catch(() => { const fb = $('#rig-fallback'); if (fb) fb.hidden = false; }); };
  if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); start(); } }, { rootMargin: '500px 0px' }); io.observe(rig); } else start();
})();
// the mission bar: which phase, what is happening in plain words, what comes next, which failures are on
(() => {
  const PH = ['Launch', 'Assembly', 'Formation', 'Transit', 'Split', 'Search', 'Rendezvous', 'Re-form', 'Return and landing', 'Complete'];
  const WHAT = [
    'The aircraft take off one after another; ground robots and boats leave their start points.',
    'Every aircraft flies to the assembly point and finds its place in the group.',
    'The groups form up into wedges, each aircraft holding its own slot.',
    'The whole formation flies together to the search area.',
    'The fleet divides into two groups: one for the land, one for the water.',
    'Each vehicle takes its own search lane or station, so nothing is searched twice and nothing is missed.',
    'The two groups fly to the meeting point and join up again.',
    'The groups merge back into one formation.',
    'The fleet flies home; the aircraft land one by one.',
    'Mission complete: every vehicle is home or accounted for.',
  ];
  const n = $('#mb-n'), ph = $('#mb-ph'), what = $('#mb-what'), next = $('#mb-next'), fail = $('#mb-fail'), dots = $$('.mb-dots li');
  let last = -1, lastF = '';
  setInterval(() => {
    const L = window.__live; if (!L || !L.phase) return;
    const p = L.phase(); if (p === null || p === undefined) return;
    if (p !== last) { last = p; n.textContent = `${p + 1} of 10`; ph.textContent = PH[p] || ''; what.textContent = WHAT[p] || ''; next.textContent = p < 9 ? PH[p + 1] : '—';
      dots.forEach((d, i) => { d.className = i < p ? 'done' : i === p ? 'on' : ''; }); }
    const on = [...document.querySelectorAll('.inject [aria-pressed="true"]')].map(b => b.textContent.trim());
    const f = on.length ? on.join(', ') : 'None';
    if (f !== lastF) { lastF = f; fail.textContent = f; fail.classList.toggle('on', on.length > 0); }
  }, 400);
  const mt = $('#moretoggle'), rig = $('#rig');
  if (mt && rig) mt.addEventListener('click', () => { const open = rig.classList.toggle('lite') === false; mt.setAttribute('aria-expanded', String(open)); mt.textContent = open ? 'Fewer controls' : 'More controls and keyboard'; });
})();

checkViews(); setTimeout(checkViews, 150);

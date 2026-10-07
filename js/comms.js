// HiveNodes mission briefing. The film is pinned beside a panel; the scroll position inside #mission picks the chapter,
// the panel shows that chapter, and the film plays (and loops) that chapter's footage. Two video layers are used: the
// next chapter (or the next loop) is prepared on the hidden layer and cross-faded in, so changing chapter never flashes
// or stutters. Over the film, on a transparent canvas in the same figure, thin lines show the network between
// neighbouring vehicles and, when one speaks, the link to whom it speaks. The words are in the panel's fleet-radio log,
// never on the picture. Vehicle positions come from media/film-tracks.json, exported frame by frame from Blender.
const $ = (s, r = document) => r.querySelector(s);

// the operator's whole input: a position and the job
const task = { ll: '33.9178 N, 78.5126 E', type: 'Surveillance' };
const isTarget = () => task.type !== 'Surveillance';

// [time s, speaker kind, listener kind ('all' = everyone in frame, 'op' = the operator), line, tone]
const script = () => [
  [0.8, 'air', 'all', 'Formed up. One plan, every vehicle.', ''],
  [6.4, 'air', 'gnd', 'Over the lake. Ground team, we have your route.', ''],
  [11.4, 'gnd', 'air', 'UGVs rolling to the position. Watch our route.', ''],
  [17.1, 'air', 'all', 'GPS jammed. Navigating on terrain and neighbours.', 'amber'],
  [20.2, 'air', 'all', 'Same map on every vehicle. Holding the ring.', ''],
  [23.1, 'air', 'all', 'Radio weak. Climbing to relay.', 'amber'],
  [28.6, 'air', 'all', 'UAV-03 lost. Taking its search lane.', 'red'],
  [34.1, 'lead', 'air', 'Split. Search lines one to five.', ''],
  [40.1, 'air', 'gnd', `Eyes on ${task.ll}. Route clear.`, ''],
  [43.4, 'air', 'op', isTarget() ? 'Target position confirmed. Holding for approval.' : 'Position under watch. Reporting.', isTarget() ? 'amber' : ''],
  [46.6, 'op', 'all', `Task: ${task.type.toUpperCase()} at ${task.ll}.`, ''],
  [48.2, 'air', 'op', 'Tasking received. Plan shared to every vehicle.', ''],
  [50.6, 'op', 'all', isTarget() ? 'Approved.' : 'Keep watching. Report changes.', ''],
  [52.2, 'gnd', 'all', 'UGVs at the position. UAVs holding above.', ''],
];
let SCRIPT = script();
const WHO = { air: 'UAV', lead: 'UAV', gnd: 'UGV', sea: 'USV', op: 'Operator', all: 'All' };
const kindOf = v => v.kind.startsWith('Ground') ? 'gnd' : v.kind.startsWith('Surface') ? 'sea' : v.kind.includes('lead') ? 'lead' : 'air';
const label = v => { const [p, n] = v.name.split('-'); return `${p === 'AIR' ? 'UAV' : p === 'GND' ? 'UGV' : 'USV'}-${n}`; };

export async function startBrief({ RM }) {
  const sec = $('#mission'), A = $('#filmv'), B = $('#filmv2'), cv = $('#film-cv'), box = $('#film'), log = $('#comms');
  const chs = [...sec.querySelectorAll('.ch')], steps = [...sec.querySelectorAll('.steps li')];
  const ctx = cv.getContext('2d');
  // footage sources: the main film, or a chapter's own clip (data-src, with its own tracks and radio lines)
  const MAIN = 'media/hero-film', av1 = A.canPlayType('video/mp4; codecs="av01.0.08M.10"'), vp9 = A.canPlayType('video/webm; codecs="vp9"');
  const url = base => base + (av1 ? '-av1.mp4' : vp9 ? '.webm' : '.mp4');
  const TR = {}, tracksFor = (base, file) => { if (!(base in TR)) { TR[base] = null; fetch(file).then(r => r.json()).then(j => { if (j && Array.isArray(j.frames_uv)) TR[base] = j; }).catch(() => {}); } return TR[base]; };
  tracksFor(MAIN, 'media/film-tracks.json');
  let base = MAIN, radio = null, said = new Set();
  let front = A, back = B;

  // ---- the radio log: lines arrive as the footage reaches them; three kept
  let shown = -1;
  const say = (SC, i, from, to) => {
    const [, , , text, tone] = SC[i];
    const li = document.createElement('li'); if (tone) li.className = tone;
    const who = document.createElement('b'); who.textContent = `${from} → ${to}`;
    const msg = document.createElement('span'); msg.textContent = text; li.append(who, msg); log.append(li);
    while (log.children.length > 3) log.firstElementChild.remove();
  };

  // ---- the tasking console
  const ll = $('#tk-ll'), types = [...sec.querySelectorAll('.tk-type button')], go = $('#tk-go');
  types.forEach(b => b.addEventListener('click', () => { types.forEach(x => x.setAttribute('aria-checked', String(x === b))); task.type = b.dataset.type; }));
  go?.addEventListener('click', () => {
    task.ll = (ll.value || '').trim().slice(0, 40) || task.ll; SCRIPT = script(); log.textContent = ''; shown = -1;
    go.textContent = 'Tasked'; go.classList.add('sent'); setTimeout(() => { go.textContent = 'Task the fleet'; go.classList.remove('sent'); }, 2500);
    cue(t0);
  });

  // ---- double-buffered playback: prepare the hidden layer at `at`, then cross-fade to it
  let t0 = 0, t1 = 54, busy = false, pending = null;
  const cue = at => {
    if (busy) { pending = at; return; } busy = true;   // a change during a fade runs right after it
    if (back.dataset.base !== base) {                   // the chapter uses other footage: load it on the hidden layer first
      back.dataset.base = base; back._loaded = false; back.src = url(base);
      back.addEventListener('loadedmetadata', () => { back.currentTime = at; back.addEventListener('seeked', () => go2(), { once: true }); }, { once: true });
    }
    const go2 = () => { back.play().catch(() => {}); back.classList.add('front'); front.classList.remove('front');
      const old = front; front = back; back = old; shown = -1;
      setTimeout(() => { old.pause(); busy = false; if (pending !== null) { const p = pending; pending = null; cue(p); } }, 500); };
    if (back.dataset.base === base && back.readyState >= 1 && back.src && back.networkState !== 0 && back._loaded) {
      if (back.readyState >= 2 && Math.abs(back.currentTime - at) < .1) { go2(); return; }   // already parked there: fade at once
      back.currentTime = at; back.addEventListener('seeked', go2, { once: true });
    }
  };

  // ---- chapters from scroll
  let cur = -1;
  const pick = () => {
    const r = sec.getBoundingClientRect(), span = Math.max(1, r.height - innerHeight);
    const u = Math.min(.999, Math.max(0, -r.top / span)), i = Math.floor(u * chs.length);
    if (i === cur) return; cur = i;
    chs.forEach((c, k) => c.classList.toggle('on', k === i)); steps.forEach((s, k) => s.classList.toggle('on', k <= i));
    t0 = +chs[i].dataset.t0; t1 = +chs[i].dataset.t1; log.textContent = ''; shown = -1; said = new Set();
    base = chs[i].dataset.src || MAIN; if (chs[i].dataset.tracks) tracksFor(base, chs[i].dataset.tracks);
    try { radio = chs[i].dataset.radio ? JSON.parse(chs[i].dataset.radio) : null; } catch { radio = null; }
    if (front.readyState >= 1) cue(t0 + .05);
    // after the fade, park the hidden layer on the NEXT chapter's first frame, so the next change needs no seek-and-decode
    const nx = chs[Math.min(chs.length - 1, i + 1)];
    setTimeout(() => { if (!busy && back.readyState >= 1 && (nx.dataset.src || MAIN) === back.dataset.base) back.currentTime = +nx.dataset.t0 + .05; }, 700);
  };
  addEventListener('scroll', pick, { passive: true }); addEventListener('resize', pick);
  // loop inside the chapter by cross-fading back to its start shortly before its end
  setInterval(() => { if (!front.paused && front.currentTime >= t1 - .55) cue(t0 + .05); }, 100);

  // ---- the network overlay
  let W = 0, H = 0, dp = 1;
  const fit = () => { const r = box.getBoundingClientRect(); dp = Math.min(devicePixelRatio || 1, 1.5); W = cv.width = Math.round(r.width * dp); H = cv.height = Math.round(r.height * dp); };
  new ResizeObserver(fit).observe(box); fit();
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const v = front, t = v.currentTime, T = TR[v.dataset.base] || null, SC = radio || SCRIPT;
    let i = -1; for (let k = 0; k < SC.length; k++) if (t >= SC[k][0] && SC[k][0] >= t0 - .6 && SC[k][0] < t1) i = k;
    const once = (k, a, b) => { if (k !== shown) { shown = k; if (!said.has(k)) { said.add(k); say(SC, k, a, b); } } };
    if (!T) { if (i >= 0) once(i, WHO[SC[i][1]], WHO[SC[i][2]]); return; }
    const vw = v.videoWidth || T.width, vh = v.videoHeight || T.height, s = Math.max(W / vw, H / vh), ox = (W - vw * s) / 2, oy = (H - vh * s) / 2;
    const f = Math.min(T.frames - 1, Math.max(0, Math.round(t * T.fps)));
    const V = T.vehicles, P = (T.frames_uv[f] || []).map(([k, u, w, r]) => ({ k, x: ox + u * vw * s, y: oy + w * vh * s, r: r * vw * s, kind: kindOf(V[k]) }))
      .filter(p => p.x > -20 && p.x < W + 20 && p.y > -20 && p.y < H + 20);
    const E = T.events || {}, alive = p => !(V[p.k].name === E.lostVehicle && t >= E.lost);   // a lost UAV never speaks
    // neighbour links: each vehicle to its nearest neighbour within reach, one hairline path
    const reach = Math.max(W, H) * .2; ctx.lineWidth = dp; ctx.strokeStyle = 'rgba(236,235,231,.16)'; ctx.beginPath();
    for (let a = 0; a < P.length; a++) { let b = -1, d = reach * reach;
      for (let c = 0; c < P.length; c++) { if (c === a) continue; const dx = P[a].x - P[c].x, dy = P[a].y - P[c].y, q = dx * dx + dy * dy; if (q < d) { d = q; b = c; } }
      if (b >= 0) { ctx.moveTo(P[a].x, P[a].y); ctx.lineTo(P[b].x, P[b].y); } }
    ctx.stroke();
    for (const p of P) if (!alive(p)) { ctx.strokeStyle = 'rgba(255,90,74,.9)'; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(8 * dp, Math.min(p.r * 1.3, 24 * dp)), 0, 7); ctx.stroke(); }
    if (i >= 0) {
      const [ts, sk, lk, , tone] = SC[i], age = t - ts, col = tone === 'amber' ? '242,181,68' : '236,235,231';
      const near = kind => P.filter(p => alive(p) && (kind === 'air' ? p.kind === 'air' || p.kind === 'lead' : p.kind === kind)).sort((a, b) => Math.hypot(a.x - W / 2, a.y - H / 2) - Math.hypot(b.x - W / 2, b.y - H / 2))[0];
      const sp = sk === 'op' ? { x: W - 24 * dp, y: H - 24 * dp, virt: true } : near(sk) || { x: W / 2, y: -10 * dp, virt: true };
      const to = lk === 'all' ? P.filter(p => p !== sp && alive(p)).sort((a, b) => Math.hypot(a.x - sp.x, a.y - sp.y) - Math.hypot(b.x - sp.x, b.y - sp.y)).slice(0, 4)
        : lk === 'op' ? [{ x: W - 24 * dp, y: H - 24 * dp }] : [near(lk) || { x: W / 2, y: H - 10 * dp }];
      once(i, sp.virt ? WHO[sk] : label(V[sp.k]), lk === 'all' ? 'All' : lk === 'op' ? 'Operator' : to[0] && to[0].k !== undefined ? label(V[to[0].k]) : WHO[lk]);
      // draw a link only when a real vehicle is on screen at one end (no stray lines across the ground-station shot)
      const real = !sp.virt || to.some(b => b && b.k !== undefined);
      if (real && P.length && age < 2.5) { const a = Math.min(1, age * 4) * Math.min(1, (2.5 - age) * 2);
        ctx.strokeStyle = `rgba(${col},${.8 * a})`; ctx.lineWidth = 1.2 * dp; ctx.beginPath();
        for (const b of to) { ctx.moveTo(sp.x, sp.y); ctx.lineTo(b.x, b.y); } ctx.stroke();
        ctx.fillStyle = `rgba(${col},${a})`; const q = Math.min(1, age / 1.2);
        for (const b of to) { ctx.beginPath(); ctx.arc(sp.x + (b.x - sp.x) * q, sp.y + (b.y - sp.y) * q, 2 * dp, 0, 7); ctx.fill(); }
      }
    }
  }

  // ---- play only while the briefing is on screen; the film downloads after the page has loaded
  let running = false, onScreen = true, last = 0;
  const loop = now => { if (!running) return; requestAnimationFrame(loop); if (now - last < 40) return; last = now; draw(); };
  const sync = () => { const on = onScreen && document.visibilityState === 'visible';
    if (on && !running) { running = true; if (!RM) front.play().catch(() => {}); requestAnimationFrame(loop); } else if (!on && running) { running = false; front.pause(); } };
  new IntersectionObserver(es => { onScreen = es.some(e => e.isIntersecting); sync(); }).observe(box);
  document.addEventListener('visibilitychange', sync);
  for (const v of [A, B]) { v.dataset.base = MAIN; v.preload = 'auto'; v.src = url(MAIN); v.addEventListener('loadeddata', () => { v._loaded = true; }); }
  A.addEventListener('loadedmetadata', () => { cur = -1; pick(); if (cur >= 0) { A.currentTime = t0 + .05; } }, { once: true });
  pick(); sync();
}

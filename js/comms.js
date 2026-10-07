// HiveNodes mission briefing. The film is pinned beside a panel; the scroll position inside #mission picks the chapter,
// the panel shows that chapter, and the film plays (and loops) that chapter's footage. Over the film, on a transparent
// canvas in the same figure, thin lines show the network between neighbouring vehicles and, when one speaks, the link
// to whom it speaks. The words are in the panel's fleet-radio log, never on the picture. Vehicle positions come from
// media/film-tracks.json, exported frame by frame from the Blender scene.
const $ = (s, r = document) => r.querySelector(s);

// [time s, speaker kind, listener kind ('all' = everyone in frame, 'op' = the operator), line, tone]
const SCRIPT = [
  [0.6, 'air', 'all', 'Formed up. One plan, every vehicle.', ''],
  [6.4, 'sea', 'air', 'USVs on the lake. Shoreline covered.', ''],
  [11.4, 'gnd', 'air', 'Ground team rolling. Watch our route.', ''],
  [17.1, 'air', 'all', 'GPS jammed. Navigating on terrain and neighbours.', 'amber'],
  [20.2, 'air', 'all', 'Same map on every UAV. Holding the ring.', ''],
  [23.1, 'air', 'all', 'Radio weak. Climbing to relay.', 'amber'],
  [28.6, 'air', 'all', 'UAV-03 lost. Taking its search lane.', 'red'],
  [34.1, 'lead', 'air', 'Split. Search lines one to five.', ''],
  [40.1, 'air', 'gnd', 'Eyes on the ground team. Route clear.', ''],
  [43.4, 'gnd', 'op', 'Ready to move in. Request approval.', 'amber'],
  [47.0, 'op', 'all', 'Approved. Ground team, go.', ''],
  [50.5, 'gnd', 'all', 'Moving in. UAVs holding above.', ''],
];
const WHO = { air: 'UAV', lead: 'UAV', gnd: 'UGV', sea: 'USV', op: 'Operator', all: 'All' };
const kindOf = v => v.kind.startsWith('Ground') ? 'gnd' : v.kind.startsWith('Surface') ? 'sea' : v.kind.includes('lead') ? 'lead' : 'air';
const label = v => { const [p, n] = v.name.split('-'); return `${p === 'AIR' ? 'UAV' : p === 'GND' ? 'UGV' : 'USV'}-${n}`; };

export async function startBrief({ RM }) {
  const sec = $('#mission'), v = $('#filmv'), cv = $('#film-cv'), box = $('#film'), log = $('#comms');
  const chs = [...sec.querySelectorAll('.ch')], steps = [...sec.querySelectorAll('.steps li')];
  const ctx = cv.getContext('2d');
  let T = null; fetch('media/film-tracks.json').then(r => r.json()).then(j => { if (j && Array.isArray(j.frames_uv)) T = j; }).catch(() => {});

  // ---- the radio log: lines arrive as the footage reaches them; three kept
  let shown = -1;
  const say = (i, from, to) => {
    const [, , , text, tone] = SCRIPT[i];
    const li = document.createElement('li'); if (tone) li.className = tone;
    const who = document.createElement('b'); who.textContent = `${from} → ${to}`;
    const msg = document.createElement('span'); msg.textContent = text; li.append(who, msg); log.append(li);
    while (log.children.length > 3) log.firstElementChild.remove();
  };

  // ---- chapters from scroll
  let cur = -1, t0 = 0, t1 = 54;
  const pick = () => {
    const r = sec.getBoundingClientRect(), span = Math.max(1, r.height - innerHeight);
    const u = Math.min(.999, Math.max(0, -r.top / span)), i = Math.floor(u * chs.length);
    if (i === cur) return; cur = i;
    chs.forEach((c, k) => c.classList.toggle('on', k === i)); steps.forEach((s, k) => s.classList.toggle('on', k <= i));
    t0 = +chs[i].dataset.t0; t1 = +chs[i].dataset.t1; shown = -1; log.textContent = '';
    if (v.readyState >= 1) v.currentTime = t0 + .05; else v.addEventListener('loadedmetadata', () => { v.currentTime = t0 + .05; }, { once: true });
  };
  addEventListener('scroll', pick, { passive: true }); addEventListener('resize', pick); pick();
  v.addEventListener('timeupdate', () => { if (v.currentTime >= t1 - .05 || v.currentTime < t0 - .5) { v.currentTime = t0 + .05; shown = -1; } });

  // ---- the network overlay
  let W = 0, H = 0, dp = 1;
  const fit = () => { const r = box.getBoundingClientRect(); dp = Math.min(devicePixelRatio || 1, 1.5); W = cv.width = Math.round(r.width * dp); H = cv.height = Math.round(r.height * dp); };
  new ResizeObserver(fit).observe(box); fit();
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const t = v.currentTime;
    let i = -1; for (let k = 0; k < SCRIPT.length; k++) if (t >= SCRIPT[k][0] && SCRIPT[k][0] >= t0 - .01 && SCRIPT[k][0] < t1) i = k;
    if (!T) { if (i >= 0 && i !== shown) { shown = i; say(i, WHO[SCRIPT[i][1]], WHO[SCRIPT[i][2]]); } return; }
    const vw = v.videoWidth || T.width, vh = v.videoHeight || T.height, s = Math.max(W / vw, H / vh), ox = (W - vw * s) / 2, oy = (H - vh * s) / 2;
    const f = Math.min(T.frames - 1, Math.max(0, Math.round(t * T.fps)));
    const V = T.vehicles, P = (T.frames_uv[f] || []).map(([k, u, w, r]) => ({ k, x: ox + u * vw * s, y: oy + w * vh * s, r: r * vw * s, kind: kindOf(V[k]) }))
      .filter(p => p.x > -20 && p.x < W + 20 && p.y > -20 && p.y < H + 20);
    // neighbour links: each vehicle to its nearest neighbour within reach, one hairline path
    const reach = Math.max(W, H) * .2; ctx.lineWidth = dp; ctx.strokeStyle = 'rgba(236,235,231,.16)'; ctx.beginPath();
    for (let a = 0; a < P.length; a++) { let b = -1, d = reach * reach;
      for (let c = 0; c < P.length; c++) { if (c === a) continue; const dx = P[a].x - P[c].x, dy = P[a].y - P[c].y, q = dx * dx + dy * dy; if (q < d) { d = q; b = c; } }
      if (b >= 0) { ctx.moveTo(P[a].x, P[a].y); ctx.lineTo(P[b].x, P[b].y); } }
    ctx.stroke();
    // the lost UAV: a thin red ring
    const E = T.events || {};
    for (const p of P) if (V[p.k].name === E.lostVehicle && t >= E.lost) { ctx.strokeStyle = 'rgba(255,90,74,.9)'; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(8 * dp, Math.min(p.r * 1.3, 24 * dp)), 0, 7); ctx.stroke(); }
    // the line being spoken: one link from speaker to listener(s) for 2.5 s
    if (i >= 0) {
      const [ts, sk, lk, , tone] = SCRIPT[i], age = t - ts, col = tone === 'amber' ? '242,181,68' : '236,235,231';
      const alive = p => !(V[p.k].name === E.lostVehicle && t >= E.lost);   // a lost UAV never speaks
      const near = kind => P.filter(p => alive(p) && (kind === 'air' ? p.kind === 'air' || p.kind === 'lead' : p.kind === kind)).sort((a, b) => Math.hypot(a.x - W / 2, a.y - H / 2) - Math.hypot(b.x - W / 2, b.y - H / 2))[0];
      const sp = near(sk) || { x: W / 2, y: -10 * dp, virt: true };
      const to = lk === 'all' ? P.filter(p => p !== sp && alive(p)).sort((a, b) => Math.hypot(a.x - sp.x, a.y - sp.y) - Math.hypot(b.x - sp.x, b.y - sp.y)).slice(0, 4)
        : lk === 'op' ? [{ x: W - 24 * dp, y: H - 24 * dp }] : [near(lk) || { x: W / 2, y: H - 10 * dp }];
      if (i !== shown) { shown = i; say(i, sp.virt ? WHO[sk] : label(V[sp.k]), lk === 'all' ? 'All' : lk === 'op' ? 'Operator' : to[0] && to[0].k !== undefined ? label(V[to[0].k]) : WHO[lk]); }
      if (age < 2.5) { const a = Math.min(1, age * 4) * Math.min(1, (2.5 - age) * 2);
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
    if (on && !running) { running = true; if (!RM) v.play().catch(() => {}); requestAnimationFrame(loop); } else if (!on && running) { running = false; v.pause(); } };
  new IntersectionObserver(es => { onScreen = es.some(e => e.isIntersecting); sync(); }).observe(box);
  document.addEventListener('visibilitychange', sync); v.addEventListener('seeked', draw);
  v.preload = 'auto'; v.load(); sync();
}

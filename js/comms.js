// HiveNodes hero: the film, with the fleet TALKING. A transparent canvas, layered on the video inside the same
// figure (one picture, two layers), draws the network: a faint mesh between neighbours, data packets running along it, and
// for each line of dialogue a bright link from the vehicle speaking to the one it speaks to. The words themselves are
// in the strip below the film, never on the picture. Positions come from media/film-tracks.json, exported frame by
// frame from the Blender scene, so every link ends on a vehicle the scene put there.
const $ = (s, r = document) => r.querySelector(s);

// [time s, speaker kind, listener kind ('all' = everyone in frame), line, tone]
const SCRIPT = [
  [0.6, 'air', 'all', 'Formed up. One plan, every vehicle.', ''],
  [6.4, 'sea', 'air', 'Boats on the lake. Shoreline covered.', ''],
  [11.4, 'gnd', 'air', 'Ground team rolling. Watch our route.', ''],
  [17.1, 'air', 'all', 'GPS jammed. Steering by the ground below.', 'amber'],
  [20.2, 'air', 'all', 'Same map on every aircraft. Holding the ring.', ''],
  [23.1, 'air', 'all', 'Radio weak. Climbing to relay for you.', 'amber'],
  [28.6, 'air', 'all', 'UAV-03 lost. Taking over its search lane.', 'red'],
  [34.1, 'lead', 'air', 'Split. Search lines one to five.', ''],
  [40.1, 'air', 'gnd', 'Eyes on the ground team. Path is clear.', ''],
  [43.4, 'gnd', 'op', 'Ready to move in. Operator, approve?', 'amber'],
  [47.0, 'op', 'all', 'Approved. Ground team, go.', ''],
  [50.5, 'gnd', 'all', 'Moving in. Fleet holding the ring above us.', ''],
];
const WHO = { air: 'UAV', lead: 'UAV', gnd: 'UGV', sea: 'USV', op: 'Operator', all: 'All' };   // the operator speaks from the ground station (bottom right of the frame)
const kindOf = v => v.kind.startsWith('Ground') ? 'gnd' : v.kind.startsWith('Surface') ? 'sea' : v.kind.includes('lead') ? 'lead' : 'air';
const label = v => { const [p, n] = v.name.split('-'); return `${p === 'AIR' ? 'UAV' : p === 'GND' ? 'UGV' : 'USV'}-${n}`; };

export async function startComms({ RM }) {
  const v = $('#filmv'), cv = $('#film-cv'), box = $('#film'), log = $('#comms');
  let T; try { T = await (await fetch('media/film-tracks.json')).json(); } catch { return; }
  if (!T || !Array.isArray(T.frames_uv)) return;
  const V = T.vehicles.map(x => ({ ...x, k: kindOf(x) })), ctx = cv.getContext('2d');
  let W = 0, H = 0, dp = 1, live = false, shown = -1;
  const fit = () => { const r = box.getBoundingClientRect(); dp = Math.min(devicePixelRatio || 1, 1.5); W = cv.width = Math.round(r.width * dp); H = cv.height = Math.round(r.height * dp); };
  new ResizeObserver(fit).observe(box); fit();
  const goLive = () => { if (live || v.readyState < 2) return; live = true; box.classList.add('live'); };
  v.addEventListener('loadeddata', goLive); v.addEventListener('playing', goLive); goLive();

  // video fills the box like object-fit:cover; map film uv to canvas pixels
  const geo = () => { const vw = v.videoWidth || T.width, vh = v.videoHeight || T.height, s = Math.max(W / vw, H / vh);
    return { s, ox: (W - vw * s) / 2, oy: (H - vh * s) / 2, vw, vh }; };
  const lineAt = t => { let i = -1; for (let k = 0; k < SCRIPT.length; k++) if (t >= SCRIPT[k][0]) i = k; return i; };

  // the dialogue strip: newest line types itself out; three lines kept
  function say(i, names) {
    const [, , , text, tone] = SCRIPT[i];
    const li = document.createElement('li'); if (tone) li.className = tone;
    const who = document.createElement('b'); who.textContent = `${names[0]} → ${names[1]}`;
    const msg = document.createElement('span'); li.append(who, msg); log.append(li);
    while (log.children.length > 3) log.firstElementChild.remove();
    if (RM) { msg.textContent = text; return; }
    let n = 0; const tick = () => { msg.textContent = text.slice(0, ++n); if (n < text.length) setTimeout(tick, 22); }; tick();
  }

  function brackets(p, c, a) {   // a thin ring around a vehicle (named for its old corner-bracket form)
    const r = Math.max(9 * dp, Math.min(p.r * 1.3, 26 * dp)); ctx.strokeStyle = `rgba(${c},${a})`; ctx.lineWidth = 1.1 * dp;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.stroke();
  }
  const lens = { on: false, a: 0, x: 0, y: 0, tx: 0, ty: 0 };
  const aim = e => { const r = box.getBoundingClientRect(); lens.tx = (e.clientX - r.left) * dp; lens.ty = (e.clientY - r.top) * dp; if (!lens.on) { lens.x = lens.tx; lens.y = lens.ty; } lens.on = true; };
  box.addEventListener('pointermove', aim); box.addEventListener('pointerdown', aim);
  box.addEventListener('pointerleave', () => { lens.on = false; }); box.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') lens.on = false; });
  const sprites = {}, glow = c => sprites[c] || (sprites[c] = (() => { const g = document.createElement('canvas'); g.width = g.height = 64; const x = g.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, `rgba(${c},.18)`); gr.addColorStop(1, `rgba(${c},0)`); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return g; })());
  const seed = i => { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); };
  function draw() {
    if (!W) return;
    const t = v.currentTime, f = Math.min(T.frames - 1, Math.max(0, Math.round(t * T.fps))), g = geo();
    ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, W, H);   // the video shows itself underneath; this layer is only the network
    const P = (T.frames_uv[f] || []).map(([k, u, w, r]) => ({ k, x: g.ox + u * g.vw * g.s, y: g.oy + w * g.vh * g.s, r: r * g.vw * g.s, kind: V[k].k }))
      .filter(p => p.x > -20 && p.x < W + 20 && p.y > -20 && p.y < H + 20);
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    // the mesh: each vehicle to its two nearest neighbours, packets running along
    const maxd = Math.max(W, H) * .22, edges = [];
    // two nearest within reach, found with plain loops (this runs every frame on phones too)
    const md2 = maxd * maxd, seen = new Set();
    for (let i = 0; i < P.length; i++) { let b1 = -1, b2 = -1, d1 = md2, d2 = md2; const a = P[i];
      for (let j = 0; j < P.length; j++) { if (j === i) continue; const dx = a.x - P[j].x, dy = a.y - P[j].y, d = dx * dx + dy * dy;
        if (d < d1) { b2 = b1; d2 = d1; b1 = j; d1 = d; } else if (d < d2) { b2 = j; d2 = d; } }
      for (const [j, d] of [[b1, d1], [b2, d2]]) { if (j < 0) continue; const key = i < j ? i * 999 + j : j * 999 + i; if (seen.has(key)) continue; seen.add(key); edges.push([i, j, Math.sqrt(d)]); } }
    ctx.lineWidth = dp; ctx.strokeStyle = 'rgba(150,215,255,.09)'; ctx.beginPath();
    for (const [i, j] of edges) { ctx.moveTo(P[i].x, P[i].y); ctx.lineTo(P[j].x, P[j].y); } ctx.stroke();
    ctx.fillStyle = 'rgba(210,240,255,.7)'; const ps = 3 * dp;
    for (const [i, j] of edges) { const a = P[i], b = P[j], s = seed(a.k * 97 + b.k), q = ((t * (.35 + s * .5) + s) % 1);
      ctx.beginPath(); ctx.arc(a.x + (b.x - a.x) * q, a.y + (b.y - a.y) * q, ps / 2, 0, 7); ctx.fill(); }
    // each vehicle: a small soft glow (brackets only on the ones talking, and red on a lost one)
    const lost = T.events && T.events.lostVehicle, tl = T.events && T.events.lost;
    for (const p of P) {
      const r = Math.max(5 * dp, p.r * .9), c = p.kind === 'gnd' ? '255,226,170' : p.kind === 'sea' ? '170,235,245' : '207,233,255';
      ctx.drawImage(glow(c), p.x - r * 1.4, p.y - r * 1.4, r * 2.8, r * 2.8);
      if (V[p.k].name === lost && t >= tl) brackets(p, '255,90,74', .95);
    }
    // the line being spoken: a bright link from the speaker, a pulse, packets streaming to the listener(s)
    const i = lineAt(t);
    if (i >= 0) {
      const [t0, sk, lk, , tone] = SCRIPT[i], age = t - t0, col = tone === 'amber' ? '242,181,68' : '220,242,255';
      const pick = kind => P.filter(p => kind === 'air' ? p.kind === 'air' || p.kind === 'lead' : p.kind === kind).sort((a, b) => Math.hypot(a.x - W / 2, a.y - H / 2) - Math.hypot(b.x - W / 2, b.y - H / 2))[0];
      const sp = pick(sk) || { x: W / 2, y: -12 * dp, virt: true };   // the speaker is off screen (or is the camera): the link comes in from above
      const to = lk === 'all' ? P.filter(p => p !== sp).sort((a, b) => Math.hypot(a.x - sp?.x, a.y - sp?.y) - Math.hypot(b.x - sp?.x, b.y - sp?.y)).slice(0, 6)
        : lk === 'op' ? [{ x: W - 30 * dp, y: H - 30 * dp, op: true }] : [pick(lk) || { x: lk === 'gnd' ? W / 2 : W / 2, y: lk === 'gnd' ? H - 10 * dp : 10 * dp, edge: true }];
      if (i !== shown) { shown = i; say(i, [!sp.virt ? label(V[sp.k]) : WHO[sk], lk === 'all' ? 'All' : lk === 'op' ? 'Operator' : to[0] && to[0].k !== undefined ? label(V[to[0].k]) : WHO[lk]]); }
      if (sp && age < 3.2) {
        const env = Math.min(1, age * 3) * Math.min(1, (3.2 - age) * 1.5);
        for (const b of to) { if (!b) continue;
          const mx = (sp.x + b.x) / 2, my = (sp.y + b.y) / 2 - Math.hypot(b.x - sp.x, b.y - sp.y) * .18;
          ctx.strokeStyle = `rgba(${col},${.55 * env})`; ctx.lineWidth = 1.6 * dp; 
          ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.quadraticCurveTo(mx, my, b.x, b.y); ctx.stroke(); ctx.strokeStyle = `rgba(${col},${.18 * env})`; ctx.lineWidth = 5 * dp; ctx.stroke();
          for (let n = 0; n < 3; n++) { const q = ((age * .9 + n / 3) % 1), u = 1 - q;
            const x = u * u * sp.x + 2 * u * q * mx + q * q * b.x, y = u * u * sp.y + 2 * u * q * my + q * q * b.y;
            ctx.fillStyle = `rgba(255,255,255,${.9 * env})`; ctx.beginPath(); ctx.arc(x, y, 2.2 * dp, 0, 7); ctx.fill(); }
        }
        if (!sp.virt) brackets(sp, col, env); for (const b of to) if (b && b.k !== undefined) brackets(b, col, .6 * env);
        for (let n = 0; n < 2; n++) { const q = ((age * .8 + n * .5) % 1); ctx.strokeStyle = `rgba(${col},${(1 - q) * .8 * env})`; ctx.lineWidth = 1.4 * dp;
          ctx.beginPath(); ctx.arc(sp.x, sp.y, (8 + q * 40) * dp, 0, 7); ctx.stroke(); }
      }
    }
    // the swarm-eye lens: where the visitor points, the picture turns into what the fleet's sensors see
    if (lens.on || lens.a > .01) {
      lens.a += ((lens.on ? 1 : 0) - lens.a) * .15; lens.x += (lens.tx - lens.x) * .25; lens.y += (lens.ty - lens.y) * .25;
      const R = Math.min(W, H) * .2 * (.6 + .4 * lens.a);
      ctx.save(); ctx.beginPath(); ctx.arc(lens.x, lens.y, R, 0, 7); ctx.clip();
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = lens.a;
      ctx.filter = 'grayscale(1) contrast(2.1) brightness(1.05)';
      const zs = 1.35, zx = lens.x - (lens.x - g.ox) * zs, zy = lens.y - (lens.y - g.oy) * zs;   // 1.35x magnified under the lens
      ctx.drawImage(v, zx, zy, g.vw * g.s * zs, g.vh * g.s * zs); ctx.filter = 'none';
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(40,90,130,.18)'; ctx.fillRect(lens.x - R, lens.y - R, 2 * R, 2 * R);
      ctx.restore(); ctx.globalAlpha = 1;
      // the lens rim: one thin, still circle
      ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = `rgba(207,233,255,${.6 * lens.a})`; ctx.lineWidth = dp;
      ctx.beginPath(); ctx.arc(lens.x, lens.y, R, 0, 7); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  let running = false, onScreen = true;
  let lastDraw = 0; const loop = now => { if (!running) return; requestAnimationFrame(loop); if (now - lastDraw < 40) return; lastDraw = now; draw(); };   // one loop, 25 fps
  const sync = () => { const on = onScreen && document.visibilityState === 'visible'; if (on && !running) { running = true; if (!RM) v.play().catch(() => {}); requestAnimationFrame(loop); } else if (!on && running) { running = false; v.pause(); } };
  // between frames the packets keep moving: redraw at 30 fps too
  v.addEventListener('seeked', draw);
  v.addEventListener('timeupdate', () => { if (v.currentTime < .3) shown = -1; });
  new IntersectionObserver(es => { onScreen = es.some(e => e.isIntersecting); sync(); }).observe(box);
  document.addEventListener('visibilitychange', sync);
  if (RM) { v.addEventListener('loadeddata', () => { v.currentTime = 34.5; }, { once: true }); }
  // the film starts downloading only after the page itself has loaded, so the first picture is never kept waiting
  const begin = () => { v.preload = 'auto'; v.load(); sync(); };
  begin();   // this module itself is loaded after the page's load event
}

// HiveNodes homepage: the live display. The Scattrnodes mission engine (sim/sncore.wasm, built from the
// product source, see sim/provenance.json) runs in a worker; this file only draws what the worker posts
// and passes on the three things a visitor may do to it. Nothing here decides anything about the swarm.
// Bandwidth: nothing is fetched until the section is near, and never on Save-Data or a 2G/3G link.
const $ = (s, r = document) => r.querySelector(s);
const UF = 26;
const PHASE = ['Launch', 'Assembly', 'Formation', 'Transit', 'Split', 'Search', 'Rendezvous', 'Re-form', 'Return', 'Complete'];
const NAVN = ['unknown', 'GPS', 'vision', 'terrain', 'peer ranging', 'dead reckoning', 'fused'];
// the engine names its events by the FAILURE: GPS_DENIED_ON (1) starts the denial, _OFF (2) ends it
const E = { JAM_GPS: 1, UNJAM_GPS: 2, DEGRADE_RADIO: 3, RESTORE_RADIO: 4, LOSE: 6 };
const pad2 = n => String(n).padStart(2, '0');
const clock = t => `T+${pad2(Math.floor(t / 60))}:${pad2(Math.floor(t % 60))}`;

export function startLiveDisplay(root) {
  const cv = $('canvas', root), ctx = cv.getContext('2d');
  const out = { t: $('#lv-t', root), ph: $('#lv-ph', root), act: $('#lv-act', root), nav: $('#lv-nav', root), log: $('#lv-log', root) };
  const btn = { gps: $('[data-lv="gps"]', root), radio: $('[data-lv="radio"]', root), lose: $('[data-lv="lose"]', root), again: $('[data-lv="again"]', root) };
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dp = 1, cur = null, prev = null, at = 0, G = null, worker = null, visible = false, lastDecision = 0;
  const cam = { x: 9000, y: 6000, s: .04, tx: 9000, ty: 6000, ts: .04 };
  const trails = new Map();

  const fit = () => { const r = cv.getBoundingClientRect(); dp = Math.min(devicePixelRatio || 1, 2); W = cv.width = Math.max(320, Math.round(r.width * dp)); H = cv.height = Math.max(160, Math.round(r.height * dp)); };
  new ResizeObserver(fit).observe(cv); fit();

  worker = new Worker(new URL('./mission-worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data: m }) => {
    if (m.type === 'error') { out.log.textContent = 'The live engine could not start in this browser.'; return; }
    if (m.type !== 'frame') return;
    if (m.geom) G = m.geom;
    prev = cur; cur = { S: m.snap, n: m.n, meta: m.meta }; at = performance.now();
    if (m.log && performance.now() - (window.__lvDid || 0) > 9000) { const lines = m.log.trim().split('\n').filter(Boolean); if (lines.length) out.log.textContent = lines[lines.length - 1].replace(/^\s*T\+\S+\s*/, ''); }
    // the core asks a person to confirm some re-plans; on this page that person is simulated
    const id = m.meta[17];
    if (id && id !== lastDecision) { lastDecision = id; setTimeout(() => worker.postMessage({ type: 'confirm', id }), 1200); out.log.textContent = 'Awaiting the operator. Confirmed automatically on this page.'; }
    readouts();
  };
  worker.postMessage({ type: 'init', scenario: 3, seed: 11, at: 0 });
  worker.postMessage({ type: 'speed', v: RM ? 15 : 30 });

  const ev = (kind, arg = 0) => worker.postMessage({ type: 'event', kind, arg });
  // what the visitor did, and what the fleet did about it a few seconds later
  const did = what => {
    if (!cur) return; const t0 = cur.meta[0];
    window.__lvDid = performance.now(); out.log.textContent = `You ${what} at ${clock(t0)}.`;
    setTimeout(() => { if (!cur) return; const S = cur.S; let a = 0, all = 0;
      for (let i = 0; i < cur.n; i++) { const st = S[i * UF + 7]; if (st >= 1 && st <= 5) { all++; if (st <= 4) a++; } }
      out.log.textContent = `You ${what} at ${clock(t0)}. ${a} of ${all} vehicles still on the mission at ${clock(cur.meta[0])}.`; }, 4000);
  };
  btn.gps.addEventListener('click', () => { if (!cur) return; const off = !cur.meta[15]; ev(off ? E.JAM_GPS : E.UNJAM_GPS); did(off ? 'jammed GPS' : 'restored GPS'); btn.gps.setAttribute('aria-pressed', String(off)); btn.gps.textContent = off ? 'Restore GPS' : 'Jam GPS'; });
  btn.radio.addEventListener('click', () => { if (!cur) return; const off = !cur.meta[16]; ev(off ? E.DEGRADE_RADIO : E.RESTORE_RADIO); did(off ? 'degraded the radio' : 'restored the radio'); btn.radio.setAttribute('aria-pressed', String(off)); btn.radio.textContent = off ? 'Restore radio' : 'Degrade radio'; });
  btn.lose.addEventListener('click', () => {
    if (!cur) return; const S = cur.S, cand = [];
    for (let i = 0; i < cur.n; i++) { const o = i * UF; if (S[o + 24] === 0 && S[o + 7] === 1) cand.push(i); }
    if (cand.length) { const i = cand[Math.floor(Math.random() * cand.length)]; ev(E.LOSE, i); did(`took out aircraft U${pad2(i + 1)}`); }
  });
  btn.again.addEventListener('click', () => {
    trails.clear(); lastDecision = 0; worker.postMessage({ type: 'init', scenario: 3, seed: 1 + Math.floor(Math.random() * 999), at: 0 });
    btn.gps.setAttribute('aria-pressed', 'false'); btn.gps.textContent = 'Jam GPS'; btn.radio.setAttribute('aria-pressed', 'false'); btn.radio.textContent = 'Degrade radio';
  });

  function readouts() {
    const S = cur.S, me = cur.meta; let act = 0, lost = 0; const nav = new Map();
    for (let i = 0; i < cur.n; i++) { const o = i * UF, st = S[o + 7]; if (st === 5) lost++; if (st >= 1 && st <= 4) { act++; const k = NAVN[S[o + 9]] || 'unknown'; nav.set(k, (nav.get(k) || 0) + 1); } }
    out.t.textContent = clock(me[0]); out.ph.textContent = PHASE[me[1]] || '';
    out.act.textContent = `${act} active${lost ? ` · ${lost} lost` : ''}`;
    out.nav.textContent = [...nav.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${v} ${k}`).join(' · ');
  }

  const lerp = (a, b, k) => a + (b - a) * k;
  const sx = x => (x - cam.x) * cam.s + W / 2, sy = y => H / 2 - (y - cam.y) * cam.s;

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || !cur) return;
    const S = cur.S, P = prev && prev.n === cur.n ? prev.S : S, n = cur.n, k = Math.min(1, (now - at) / 120);
    const X = i => lerp(P[i * UF], S[i * UF], k), Y = i => lerp(P[i * UF + 1], S[i * UF + 1], k);
    // camera: frame every vehicle still flying or driving, smoothly
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i < n; i++) { const st = S[i * UF + 7]; if (st > 4) continue; const x = X(i), y = Y(i); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (x1 > x0) { cam.tx = (x0 + x1) / 2; cam.ty = (y0 + y1) / 2; cam.ts = Math.min(W / Math.max(x1 - x0 + 2600, 9000), H / Math.max(y1 - y0 + 1800, 4500)); }
    const a = RM ? 1 : .04; cam.x += (cam.tx - cam.x) * a; cam.y += (cam.ty - cam.y) * a; cam.s += (cam.ts - cam.s) * a;

    ctx.fillStyle = '#07090c'; ctx.fillRect(0, 0, W, H);
    if (G) {                                                             // the lake: everything beyond the shoreline corner
      ctx.fillStyle = '#081420'; const wx = sx(G[23]), wy = sy(G[24]); ctx.fillRect(wx, 0, W - wx, wy);
      ctx.strokeStyle = 'rgba(80,130,160,.35)'; ctx.lineWidth = dp; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(W, wy); ctx.moveTo(wx, wy); ctx.lineTo(wx, 0); ctx.stroke();
    }
    // 1 km grid
    ctx.strokeStyle = 'rgba(233,229,220,.045)'; ctx.lineWidth = dp; ctx.beginPath();
    const g = 1000 * cam.s; if (g > 6) { for (let x = ((sx(0) % g) + g) % g; x < W; x += g) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } for (let y = ((sy(0) % g) + g) % g; y < H; y += g) { ctx.moveTo(0, y); ctx.lineTo(W, y); } }
    ctx.stroke();
    // radio links (the n x n matrix after the vehicle fields): each vehicle's three nearest live links within 1.5 km
    const L0 = n * UF; ctx.lineWidth = dp; ctx.strokeStyle = 'rgba(196,165,116,.22)'; ctx.beginPath();
    for (let i = 0; i < n; i++) { const si = S[i * UF + 7]; if (si < 1 || si > 4) continue;
      const xi = X(i), yi = Y(i), near = [];
      for (let j = 0; j < n; j++) { if (j === i || !(S[L0 + i * n + j] > 0)) continue; const sj = S[j * UF + 7]; if (sj < 1 || sj > 4) continue;
        const d = Math.hypot(X(j) - xi, Y(j) - yi); if (d < 1500) near.push([d, j]); }
      near.sort((p, q) => p[0] - q[0]);
      for (const [, j] of near.slice(0, 3)) if (j > i || near.length < 2) { ctx.moveTo(sx(xi), sy(yi)); ctx.lineTo(sx(X(j)), sy(Y(j))); } }
    ctx.stroke();
    // trails, uncertainty, vehicles
    const z = Math.max(3.2 * dp, Math.min(8 * dp, cam.s * 120));
    for (let i = 0; i < n; i++) {
      const o = i * UF, st = S[o + 7]; if (st === 0 || st === 6) { trails.delete(i); continue; }
      const x = X(i), y = Y(i), kind = S[o + 24];
      let tr = trails.get(i); if (!tr) trails.set(i, tr = []);
      if (!tr.length || Math.hypot(tr[tr.length - 1][0] - x, tr[tr.length - 1][1] - y) > 60) { tr.push([x, y]); if (tr.length > 26) tr.shift(); }
      if (st !== 5 && tr.length > 1) { ctx.strokeStyle = kind ? 'rgba(125,155,181,.35)' : 'rgba(233,229,220,.16)'; ctx.lineWidth = dp; ctx.beginPath(); tr.forEach(([px, py], j) => j ? ctx.lineTo(sx(px), sy(py)) : ctx.moveTo(sx(px), sy(py))); ctx.stroke(); }
      const X_ = sx(x), Y_ = sy(y);
      if (st === 5) { ctx.strokeStyle = 'rgba(255,70,50,.9)'; ctx.lineWidth = 1.6 * dp; const r = 5 * dp; ctx.beginPath(); ctx.moveTo(X_ - r, Y_ - r); ctx.lineTo(X_ + r, Y_ + r); ctx.moveTo(X_ + r, Y_ - r); ctx.lineTo(X_ - r, Y_ + r); ctx.stroke(); continue; }
      const sig = S[o + 8]; if (sig > 15) { ctx.strokeStyle = st === 4 ? 'rgba(255,70,50,.5)' : 'rgba(163,168,174,.32)'; ctx.lineWidth = dp; ctx.beginPath(); ctx.arc(X_, Y_, Math.max(5 * dp, sig * cam.s), 0, Math.PI * 2); ctx.stroke(); }
      const hd = S[o + 3]; ctx.save(); ctx.translate(X_, Y_); ctx.rotate(-hd);
      ctx.fillStyle = st === 4 ? '#ff4632' : kind === 0 ? (S[o + 5] ? '#e9e5dc' : '#c4a574') : kind === 1 ? '#a08a62' : '#7d9bb5';
      ctx.beginPath();
      if (kind === 0) { ctx.moveTo(z, 0); ctx.lineTo(-z * .55, z * .7); ctx.lineTo(-z * .25, 0); ctx.lineTo(-z * .55, -z * .7); }
      else if (kind === 1) ctx.rect(-z * .7, -z * .45, z * 1.4, z * .9);
      else { ctx.moveTo(z, 0); ctx.lineTo(z * .2, -z * .5); ctx.lineTo(-z * .8, -z * .45); ctx.lineTo(-z * .8, z * .45); ctx.lineTo(z * .2, z * .5); }
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
  requestAnimationFrame(frame);

  const setVis = on => { visible = on; worker.postMessage({ type: 'visible', on }); };
  if ('IntersectionObserver' in window) new IntersectionObserver(es => setVis(es.some(e => e.isIntersecting))).observe(cv); else setVis(true);
  window.__homeLive = { frames: () => (cur ? cur.meta[0] : 0), n: () => (cur ? cur.n : 0) };
}

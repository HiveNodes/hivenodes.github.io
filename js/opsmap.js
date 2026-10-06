// HiveNodes hero: an ops display over REAL imagery. The ground is Copernicus Sentinel-2 true colour with Copernicus
// DEM hillshade (media/ops-map-*.webp, built by tools/make_ops_map.py); the vehicles are the film's simulated fleet
// (media/ops-tracks.json, exported from the film scene). Nothing here is decorative: every mark is a vehicle position,
// its recent track, or its navigation uncertainty in the GPS-denied beat.
const LOST_BELOW = 80;   // metres: a lead below this after take-off has been lost (the film's 0:28.5 beat)

export async function startOpsMap({ cv, onTime, RM }) {
  const [tr, img] = await Promise.all([
    fetch('media/ops-tracks.json').then(r => r.json()),
    new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej;
      i.src = innerWidth * (devicePixelRatio || 1) > 1300 ? 'media/ops-map-2048.webp' : 'media/ops-map-1200.webp'; }),
  ]);
  const ctx = cv.getContext('2d'), V = Object.entries(tr.v), N = tr.n, DT = tr.dt, DUR = N * DT, SZ = tr.size_m;
  let W = 0, H = 0, dp = 1, t = 0, last = performance.now(), running = false, seekTo = null;
  const cam = { x: 400, y: 500, s: 0 };
  const fit = () => { const r = cv.getBoundingClientRect(); dp = Math.min(devicePixelRatio || 1, 1.5); W = cv.width = Math.round(r.width * dp); H = cv.height = Math.round(r.height * dp); };
  new ResizeObserver(fit).observe(cv); fit();
  const at = (p, u) => { const i = Math.min(N - 2, Math.floor(u)), f = Math.min(1, u - i), a = p[i], b = p[i + 1]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; };
  const px = (x, y) => [W / 2 + (x - cam.x) * cam.s, H / 2 - (y - cam.y) * cam.s];

  function draw() {
    if (!W || !H) { fit(); if (!W || !H) return; }                         // not laid out yet
    if (!Number.isFinite(cam.x + cam.y + cam.s)) { cam.x = 400; cam.y = 500; cam.s = 0; }   // never let a NaN stick
    const u = t / DT, jam = t >= 17 && t < 34, jamK = jam ? Math.min(1, (t - 17) / 6) * (t > 28 ? Math.max(.35, 1 - (t - 28) / 8) : 1) : 0;
    // camera: frame the live fleet, smoothly; ~6 km across on a wide screen
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [, v] of V) { const p = at(v.p, u); if (p[2] < LOST_BELOW && v.k === 'lead' && t > 20) continue; x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    // never show past the imagery: the scale fills the frame, and the centre is clamped inside the 8.2 km square
    const fill = Math.max(W, H) / (SZ * .96);
    const ts = Math.max(fill, Math.min(W / Math.max(x1 - x0 + 1600, 3000), H / Math.max(y1 - y0 + 1200, 1800)));
    const k = cam.s ? (RM ? 1 : .03) : 1; cam.x += ((x0 + x1) / 2 - cam.x) * k; cam.y += ((y0 + y1) / 2 - cam.y) * k; cam.s += (ts - cam.s) * k;
    const hx = SZ / 2 - W / 2 / cam.s - 20, hy = SZ / 2 - H / 2 / cam.s - 20;
    cam.x = Math.max(-hx, Math.min(hx, cam.x)); cam.y = Math.max(-hy, Math.min(hy, cam.y));
    // the real ground
    const mpp = SZ / img.width, sx = W / 2 - (cam.x + SZ / 2) / mpp * cam.s * mpp, sy = H / 2 - (SZ / 2 - cam.y) / mpp * cam.s * mpp;
    ctx.fillStyle = '#05070a'; ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingQuality = 'medium'; ctx.drawImage(img, sx, sy, img.width * mpp * cam.s, img.height * mpp * cam.s);
    ctx.fillStyle = 'rgba(5,7,10,.18)'; ctx.fillRect(0, 0, W, H);                   // a little density, so the marks read
    // 1 km grid with a scale bar
    const g = 1000 * cam.s; ctx.strokeStyle = 'rgba(207,233,255,.07)'; ctx.lineWidth = dp; ctx.beginPath();
    for (let gx = Math.floor((cam.x - W / 2 / cam.s) / 1000) * 1000; gx < cam.x + W / 2 / cam.s; gx += 1000) { const [X] = px(gx, 0); ctx.moveTo(X, 0); ctx.lineTo(X, H); }
    for (let gy = Math.floor((cam.y - H / 2 / cam.s) / 1000) * 1000; gy < cam.y + H / 2 / cam.s; gy += 1000) { const [, Y] = px(0, gy); ctx.moveTo(0, Y); ctx.lineTo(W, Y); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(230,234,238,.8)'; ctx.fillRect(16 * dp, H - 18 * dp, g, 2 * dp);
    ctx.font = `${11 * dp}px "IBM Plex Mono", monospace`; ctx.fillText('1 km', 16 * dp, H - 24 * dp);
    // tracks, uncertainty, vehicles
    for (const [name, v] of V) {
      const p = at(v.p, u), q = at(v.p, Math.max(0, u - .6)), lost = v.k === 'lead' && t > 20 && p[2] < LOST_BELOW;
      const [X, Y] = px(p[0], p[1]);
      ctx.strokeStyle = v.k === 'gnd' || v.k === 'sea' ? 'rgba(242,214,160,.45)' : 'rgba(207,233,255,.32)'; ctx.lineWidth = dp; ctx.beginPath();
      for (let j = 0; j <= 12; j++) { const r = at(v.p, Math.max(0, u - j * .5)), [a, b] = px(r[0], r[1]); j ? ctx.lineTo(a, b) : ctx.moveTo(a, b); } ctx.stroke();
      if (lost) { ctx.strokeStyle = '#ff5a4a'; ctx.lineWidth = 2 * dp; const r = 6 * dp; ctx.beginPath(); ctx.moveTo(X - r, Y - r); ctx.lineTo(X + r, Y + r); ctx.moveTo(X + r, Y - r); ctx.lineTo(X - r, Y + r); ctx.stroke();
        ctx.fillStyle = '#ff5a4a'; ctx.fillText(`WEDGE ${+name.split('_')[1] + 1} LEAD LOST`, X + 10 * dp, Y - 8 * dp); continue; }
      if (jamK > 0 && (v.k === 'air' || v.k === 'lead')) { ctx.strokeStyle = `rgba(242,181,68,${.28 * jamK})`; ctx.beginPath(); ctx.arc(X, Y, (6 + 26 * jamK) * dp, 0, 7); ctx.stroke(); }
      const hd = Math.atan2(p[1] - q[1], p[0] - q[0]), z = (v.k === 'lead' ? 5.5 : v.k === 'air' ? 3.2 : 4.5) * dp;
      ctx.save(); ctx.translate(X, Y); ctx.rotate(-hd); ctx.beginPath();
      if (v.k === 'gnd') { ctx.rect(-z * .8, -z * .5, z * 1.6, z); ctx.fillStyle = '#f2d6a0'; }
      else if (v.k === 'sea') { ctx.moveTo(z * 1.1, 0); ctx.lineTo(-z * .8, -z * .55); ctx.lineTo(-z * .8, z * .55); ctx.fillStyle = '#9fd3e8'; }
      else { ctx.moveTo(z * 1.2, 0); ctx.lineTo(-z * .7, z * .75); ctx.lineTo(-z * .3, 0); ctx.lineTo(-z * .7, -z * .75); ctx.fillStyle = v.k === 'lead' ? '#cfe9ff' : '#e6eaee'; }
      ctx.closePath(); ctx.fill(); ctx.restore();
      if (v.k === 'lead') { ctx.fillStyle = 'rgba(207,233,255,.85)'; ctx.fillText(`WEDGE ${+name.split('_')[1] + 1}`, X + 10 * dp, Y - 8 * dp); }
    }
    // instrument chrome, all real state: fleet centre range rings (1 and 2 km), north arrow, the view's true coordinates
    const [cxp, cyp] = px((x0 + x1) / 2, (y0 + y1) / 2);
    ctx.strokeStyle = 'rgba(207,233,255,.16)'; ctx.setLineDash([4 * dp, 6 * dp]);
    for (const r of [1000, 2000]) { ctx.beginPath(); ctx.arc(cxp, cyp, r * cam.s, 0, 7); ctx.stroke(); }
    ctx.setLineDash([]); ctx.fillStyle = 'rgba(207,233,255,.5)'; ctx.fillText('1 km', cxp + 1000 * cam.s + 4 * dp, cyp - 4 * dp); ctx.fillText('2 km', cxp + 2000 * cam.s + 4 * dp, cyp - 4 * dp);
    const nx = W - 34 * dp, ny = 40 * dp; ctx.strokeStyle = 'rgba(230,234,238,.8)'; ctx.lineWidth = 1.5 * dp;
    ctx.beginPath(); ctx.moveTo(nx, ny - 14 * dp); ctx.lineTo(nx - 6 * dp, ny + 6 * dp); ctx.lineTo(nx, ny + 2 * dp); ctx.lineTo(nx + 6 * dp, ny + 6 * dp); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = 'rgba(230,234,238,.8)'; ctx.fillText('N', nx - 4 * dp, ny + 22 * dp);
    const lat = 33.900556 + cam.y / 111132, lon = 78.493611 + cam.x / (111320 * Math.cos(33.900556 * Math.PI / 180));
    ctx.fillStyle = 'rgba(5,7,10,.72)'; ctx.fillRect(10 * dp, 10 * dp, 250 * dp, 40 * dp); ctx.fillRect(W - 140 * dp, H - 40 * dp, 132 * dp, 28 * dp);
    ctx.fillStyle = 'rgba(230,234,238,.85)';
    ctx.fillText(`${lat.toFixed(4)}° N  ${lon.toFixed(4)}° E`, 16 * dp, 24 * dp);
    ctx.fillStyle = 'rgba(242,181,68,.9)'; ctx.fillText('SIMULATED FLEET · REAL GROUND', 16 * dp, 42 * dp);
    for (const [ax, ay, sx2, sy2] of [[10, 10, 1, 1], [W - 10 * dp, 10, -1, 1], [10, H - 10 * dp, 1, -1], [W - 10 * dp, H - 10 * dp, -1, -1]]) {
      const a2 = ax === 10 ? 10 * dp : ax, b2 = ay === 10 ? 10 * dp : ay; ctx.strokeStyle = 'rgba(230,234,238,.5)'; ctx.lineWidth = dp;
      ctx.beginPath(); ctx.moveTo(a2, b2 + 18 * dp * sy2); ctx.lineTo(a2, b2); ctx.lineTo(a2 + 18 * dp * sx2, b2); ctx.stroke(); }
    ctx.fillStyle = 'rgba(230,234,238,.75)'; ctx.fillText(`SIM T+00:${String(Math.floor(t)).padStart(2, '0')}`, W - 120 * dp, H - 24 * dp);
  }
  function frame(now) {
    if (!running) return; requestAnimationFrame(frame);
    if (now - last < 31) return;                     // 30 fps is plenty for a map; it halves the work
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    if (seekTo !== null) { t = seekTo; seekTo = null; } else t = (t + dt) % DUR;
    draw(); onTime(t);
  }
  draw(); onTime(0);
  const vis = on => { if (on && !running && !RM) { running = true; last = performance.now(); requestAnimationFrame(frame); } else if (!on) running = false; };
  if ('IntersectionObserver' in window) new IntersectionObserver(es => vis(es.some(e => e.isIntersecting))).observe(cv); else vis(true);
  cv.classList.add('on'); cv.parentElement.classList.add('filmon');
  return { seek: s => { seekTo = s; if (!running) { t = s; draw(); onTime(t); } } };
}

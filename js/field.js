// The page's ground: an engineering grid with micro-bots living on it. Each bot runs along the grid lines like a signal
// on a circuit board, turning at nodes and leaving a short light trace. Near the pointer they leave the grid and take
// slots on a turning ring around it: the pointer becomes their ghost leader, the idea the product is built on.
// One 2D canvas behind the content (data-ambient), dim enough that every word above it reads at full contrast.
// 30 fps, paused when the tab is hidden; reduced motion gets the still grid only.
export function field() {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.createElement('canvas'); cv.id = 'field'; cv.setAttribute('aria-hidden', 'true'); cv.dataset.ambient = '';
  const ctx = cv.getContext('2d'); if (!ctx) return;
  document.body.prepend(cv); document.documentElement.classList.add('field-on');
  const G = 28;                                   // grid pitch, px
  let W = 0, H = 0, dp = 1, bots = [];
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const spawn = () => { const d = DIRS[Math.random() * 4 | 0];
    return { x: Math.round(Math.random() * W / G) * G, y: Math.round(Math.random() * H / G) * G, d, p: 0, trail: [], free: false, fx: 0, fy: 0, slot: 0, sp: .6 + Math.random() * .8 }; };
  const fit = () => { dp = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * dp; cv.height = H * dp; ctx.setTransform(dp, 0, 0, dp, 0, 0);
    const n = Math.round(Math.min(220, W * H / 7000)); while (bots.length < n) bots.push(spawn()); bots.length = n; grid(); };
  // the grid is drawn once into its own layer
  const gl = document.createElement('canvas'), gx = gl.getContext('2d');
  function grid() {
    gl.width = W * dp; gl.height = H * dp; gx.setTransform(dp, 0, 0, dp, 0, 0); gx.clearRect(0, 0, W, H);
    gx.lineWidth = 1;
    gx.strokeStyle = 'rgba(160,215,255,.035)'; gx.beginPath();
    for (let x = .5; x < W; x += G) { gx.moveTo(x, 0); gx.lineTo(x, H); } for (let y = .5; y < H; y += G) { gx.moveTo(0, y); gx.lineTo(W, y); } gx.stroke();
    gx.strokeStyle = 'rgba(160,215,255,.07)'; gx.beginPath();
    for (let x = .5; x < W; x += G * 5) { gx.moveTo(x, 0); gx.lineTo(x, H); } for (let y = .5; y < H; y += G * 5) { gx.moveTo(0, y); gx.lineTo(W, y); } gx.stroke();
    gx.strokeStyle = 'rgba(207,233,255,.22)'; gx.beginPath();          // registration crosses at the major nodes
    for (let x = .5; x < W; x += G * 5) for (let y = .5; y < H; y += G * 5) { gx.moveTo(x - 4, y); gx.lineTo(x + 4, y); gx.moveTo(x, y - 4); gx.lineTo(x, y + 4); } gx.stroke();
  }
  fit(); addEventListener('resize', fit);
  const m = { x: -1e4, y: -1e4, on: false };
  addEventListener('pointermove', e => { m.x = e.clientX; m.y = e.clientY; m.on = true; }, { passive: true });
  document.addEventListener('pointerleave', () => { m.on = false; });
  let lastY = scrollY, shift = 0;

  function step(dt, T) {
    const dy = scrollY - lastY; lastY = scrollY; shift = dy;     // the grid is fixed; scrolling sweeps the bots like a current
    const ring = bots.filter(b => b.free), R = 46 + Math.min(40, ring.length * 2.2);
    let k = 0;
    for (const b of bots) {
      const near = m.on && Math.hypot(b.x - m.x, b.y - m.y) < 220;
      if (near && !b.free && ring.length < 22) { b.free = true; b.fx = b.x; b.fy = b.y; ring.push(b); }
      if (b.free && !m.on) { b.free = false; b.x = Math.round(b.fx / G) * G; b.y = Math.round(b.fy / G) * G; b.trail.length = 0; }
      if (b.free) {
        const a = T * .6 + (k++ / Math.max(ring.length, 1)) * Math.PI * 2, tx = m.x + Math.cos(a) * R, ty = m.y + Math.sin(a) * R;
        b.fx += (tx - b.fx) * Math.min(1, dt * 5); b.fy += (ty - b.fy) * Math.min(1, dt * 5);
        b.trail.push([b.fx, b.fy]); if (b.trail.length > 10) b.trail.shift(); continue;
      }
      b.p += dt * b.sp * 2.4 + Math.abs(shift) * .004;
      while (b.p >= 1) {                                       // reached the next node: record it, maybe turn
        b.p -= 1; b.x += b.d[0] * G; b.y += b.d[1] * G; b.trail.push([b.x, b.y]); if (b.trail.length > 7) b.trail.shift();
        if (Math.random() < .28) { const t = DIRS.filter(d => d[0] !== -b.d[0] || d[1] !== -b.d[1]); b.d = t[Math.random() * t.length | 0]; }
        if (b.x < -G || b.x > W + G || b.y < -G || b.y > H + G) Object.assign(b, spawn(), { trail: [] });
      }
    }
  }
  function draw(T) {
    ctx.clearRect(0, 0, W, H); ctx.drawImage(gl, 0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'square';
    // trails in three brightness bands, one path each; heads in two batches (the whole layer is a handful of draw calls)
    const band = [new Path2D(), new Path2D(), new Path2D()], heads = [], free = [];
    for (const b of bots) {
      const hx = b.free ? b.fx : b.x + b.d[0] * G * b.p, hy = b.free ? b.fy : b.y + b.d[1] * G * b.p;
      let px = hx, py = hy; const n = b.trail.length;
      for (let i = n - 1; i >= 0; i--) { const [qx, qy] = b.trail[i], k = Math.min(2, ((n - 1 - i) * 3 / Math.max(n, 1)) | 0);
        band[k].moveTo(px, py); band[k].lineTo(qx, qy); px = qx; py = qy; }
      (b.free ? free : heads).push(hx, hy);
    }
    ctx.lineWidth = 1; [.2, .12, .05].forEach((a, k) => { ctx.strokeStyle = `rgba(150,215,255,${a})`; ctx.stroke(band[k]); });
    const dots = (a, r) => { ctx.beginPath(); for (let i = 0; i < a.length; i += 2) { ctx.moveTo(a[i] + r, a[i + 1]); ctx.arc(a[i], a[i + 1], r, 0, 7); } ctx.fill(); };
    ctx.fillStyle = 'rgba(207,233,255,.5)'; dots(heads, 1.1); ctx.fillStyle = 'rgba(235,248,255,.9)'; dots(free, 1.4);
    if (m.on && bots.some(b => b.free)) {                     // the ghost leader the ring forms around
      ctx.strokeStyle = 'rgba(207,233,255,.35)'; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.arc(m.x, m.y, 8, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  if (RM) { draw(0); return; }
  let last = performance.now();
  const frame = now => { requestAnimationFrame(frame); if (document.hidden || now - last < 33) return; const dt = Math.min(.1, (now - last) / 1000); last = now; step(dt, now / 1000); draw(now / 1000); };
  requestAnimationFrame(frame);
}
